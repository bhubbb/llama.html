function preventNewline() {
  const event = window.event || $event;
  if (event.keyCode === 13) {
    event.preventDefault();
  }
}

function template(template, values) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => values[key.trim()]);
}

function genId(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }
  return result;
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

function delete_all_chats() {
  localStorage.removeItem('chats');
  const chats_event = new CustomEvent('chats-updated', { detail: { chats: {} } });
  window.dispatchEvent(chats_event);
}

async function gen_chat_name(chat, message) {
  
  const parameters = {
    n_predict     : 50,
  };
  prompt=`${chat.session.user}:\n\nSummarize the following with simple english in a few words:\n\n${chat.transcript}\n\n${chat.session.character}:\n\n`
  for await (const chunk of llama(prompt, parameters)) {
    chat.name += chunk.data.content;
    chats = chats.filter(c => c.id !== chat.id);
    chats.push(chat);
    const chats_event = new CustomEvent('chats-updated', { detail: { chats: chats } });
    window.dispatchEvent(chats_event);
  }
  localStorage.setItem('chat', JSON.stringify(chat));
  localStorage.setItem('chats', JSON.stringify(chats));

}

function new_chat() {
  chats = JSON.parse(localStorage.getItem('chats')) || [];
  id = genId();
  chat = {
    name: '',
    id: id,
    transcript: '',
    session: JSON.parse(localStorage.getItem('session')) || session,
    parameters: JSON.parse(localStorage.getItem('parameters')) || paramDefaults,
  }
  chats.push(chat);
  localStorage.setItem('chat', JSON.stringify(chat));
  localStorage.setItem('chats', JSON.stringify(chats));
  // Push event to Alpine.js
  const chats_event = new CustomEvent('chats-updated', { detail: { chats: chats } });
  window.dispatchEvent(chats_event);
  return chat;
}

async function llchat(msg = '', chat = {}) {
  if (chat === null) {
    chat = new_chat();
  }
  // const request = llama("Tell me a joke", {n_predict: 800})
  const parameters = chat.parameters;
  const stop       = [
    "</s>", 
    `${chat.session.character}:`, 
    `${chat.session.user}:`,
  ];

  const instruction = template(chat.session.historyTemplate, {
    name:    chat.session.user,
    message: msg,
  });

  const prompt = template(chat.session.template, {
    prompt:      chat.session.prompt,
    history:     chat.transcript,
    instruction: instruction,
    character:   chat.session.character,
  });

  chat.transcript += `\n\n${chat.session.user}:\n\n${msg}\n\n${chat.session.character}:\n\n`
  let html = showdown.makeHtml(chat.transcript);
  let chat_event = new CustomEvent('chat-updated', { detail: { html: html, chat: chat } });
  window.dispatchEvent(chat_event);
  for await (const chunk of llama(prompt, chat.parameters)) {
    chat.transcript += chunk.data.content;
    html = showdown.makeHtml(chat.transcript);
    chat_event = new CustomEvent('chat-updated', { detail: { html: html, chat: chat } });
    window.dispatchEvent(chat_event);
  }

  chats = chats.filter(c => c.id !== chat.id);
  chats.push(chat);
  localStorage.setItem('chat', JSON.stringify(chat));
  localStorage.setItem('chats', JSON.stringify(chats));

  if (chat.name === '') {
    await gen_chat_name(chat, msg);
  }

}
