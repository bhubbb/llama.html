function preventNewline() {
  const event = window.event || $event;
  if (event.keyCode === 13) {
    event.preventDefault();
  }
}

function template(template, values) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => values[key.trim()]);
}

/*
const prompt = `### Instruction:
Write an example makdown document.
Reply in simple markdown.

### Response:`
const response = [];
for await (const chunk of llama(prompt)) {
  response.push(chunk.data.content);
  transcript = { transcript: showdown.makeHtml(response.join('')) };
  console.log(transcript);
  const transcript_event = new CustomEvent('data-emitted', { detail: transcript });
  window.dispatchEvent(transcript_event);
}
*/

//    const request = llama("Tell me a joke", {n_predict: 800})
async function* llama(prompt, params = {}, config = {}) {
  let controller = config.controller;

  if (!controller) {
    controller = new AbortController();
  }

  const completionParams = { ...paramDefaults, ...params, prompt };

  const response = await fetch("/completion", {
    method: 'POST',
    body: JSON.stringify(completionParams),
    headers: {
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    signal: controller.signal,
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let content = "";

  try {
    let cont = true;

    while (cont) {
      const result = await reader.read();
      if (result.done) {
        break;
      }

      // sse answers in the form multiple lines of: value\n with data always present as a key. in our case we
      // mainly care about the data: key here, which we expect as json
      const text = decoder.decode(result.value);

      // parse all sse events and add them to result
      const regex = /^(\S+):\s(.*)$/gm;
      for (const match of text.matchAll(regex)) {
        result[match[1]] = match[2]
      }

      // since we know this is llama.cpp, let's just decode the json in data
      result.data = JSON.parse(result.data);
      content += result.data.content;

      // yield
      yield result;

      // if we got a stop token from server, we will break here
      if (result.data.stop) {
        if (result.data.generation_settings) {
          generation_settings = result.data.generation_settings;
        }
        break;
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error("llama error: ", e);
    }
    throw e;
  }
  finally {
    controller.abort();
  }

  return content;
}

async function chat(msg = '') {
  // const request = llama("Tell me a joke", {n_predict: 800})
  const parameters = JSON.parse(localStorage.getItem('parameters')) || parameters
  const stop       = [
    "</s>", 
    `${parameters.character}:`, 
    `${parameters.user}:`,
  ];

  const llama_params = {
    stream: parameters.stream,
    stop: stop, 
    n_predict: parseInt(parameters.n_predict),
    temperature: parseFloat(parameters.temperature),
    repeat_last_n: parseInt(parameters.repeat_last_n),
    repeat_penalty: parseInt(parameters.repeat_penalty),
    top_k: 40,
    top_p: 0.5,
  };
  console.log(llama_params);

  const history = template(parameters.historyTemplate, {
    name:    parameters.user,
    message: msg,
  });

  const prompt = template(parameters.template, {
    prompt:    parameters.prompt,
    history:   history,
    character: parameters.character,
  });

  response = [ transcript ];
  response.push(`\n\n${parameters.user}:\n\n${msg}\n\n${parameters.character}:\n\n`)
  for await (const chunk of llama(prompt, llama_params)) {
    const content = chunk.data.content;
    response.push(content);
    const html = showdown.makeHtml(response.join(''));
    const transcript_event = new CustomEvent('data-emitted', { detail: { transcript: html } });
    window.dispatchEvent(transcript_event);
  }
  transcript += response.join('');

  localStorage.setItem('transcript', transcript);

}
