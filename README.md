# llama.html

_Static_ HTML files for [llama.cpp](https://github.com/ggerganov/llama.cpp) in the theme of ChatGPT.

## Description

The goal of `llama.html` is to have a _rich_ chat interface, implemented minimally.

- `llama.html` has only three external dependencies:
    - [HTMX](https://htmx.org/) for page templating and swapping
    - [Alpine.js](https://alpinejs.dev/) for live updating of the DOM
    - [Showdown](https://showdownjs.com/) for markdown to HTML conversion in the chat transcript
- `llama.html` is in early stages of development and I am bad at _web_ development (PRs are welcome)

## Screenshots

### Settings page

![Settings page example](settings.png)

### Chat page

![Chat page example](chat.png)

## Usage

1. Get and build `llama.cpp` with the server example

        git clone https://github.com/ggerganov/llama.cpp
        cd llama.cpp
        LLAMA_BUILD_SERVER=1 make server

2. Clone `llama.html`
    
          git clone https://github.com/bhubbb/llama.HTML

3. Run `server` using the `--path` flag to overwrite the built in HTML
        
        ./server \
          --model ~/llama_models/airoboros-33b-gpt4-1.4.ggmlv3.q4_0.bin \
          --ctx-size 2048 \
          --path llama.html/html

4. Connect to local server on http://127.0.0.1:8080
