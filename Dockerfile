FROM alpine AS build

RUN set -x \
  && apk add --no-cache \
    gcc \
    g++ \
    git \
    make

RUN set -x \
  && git clone https://github.com/ggerganov/llama.cpp \
  && cd llama.cpp \
  && LLAMA_BUILD_SERVER=1 make server

RUN set -x \
  && mkdir /llama.cpp_libs \
  && ldd /llama.cpp/server \
   | grep "=> /" \
   | awk '{print $3}' \
   | xargs -I '{}' cp -v '{}' /llama.cpp_libs

FROM alpine AS llama.html

COPY --from=build \
  /llama.cpp/server \
  /llama-server

COPY --from=build \
  /llama.cpp_libs/* \
  /lib/

COPY \
  html \
  /llama.html

EXPOSE 8080
ENTRYPOINT ["/llama-server", "--path", "/llama.html", "--host", "0.0.0.0", "--model", "/model.bin"]
