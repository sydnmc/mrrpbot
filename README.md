# mrrp
sydney's personal discord bot, including a few basic features:

``?front`` - pings pluralkit api for front information on a user

``?quote`` - pulls a random quote from the server, defaulting to filtering only to messages that have reacts like 🔥, 😭, and 🍅. 

by pinging the bot and asking a message, it will automatically create a thread and have a wonderful answer for you~!! wonderful answer is AI powered ✨✨ (but running locally on our server with a gtx 1660 6gb, so it's not all that powerful of a model and her responses can be quite stupid, but that gives her charm :3 if you're curious, it uses microsoft's [phi4](https://huggingface.co/microsoft/phi-4) running a local [llama.cpp](https://github.com/ggml-org/llama.cpp) server)~

this bot also handles user additions to [flanstore](https://github.com/sydnmc/flanstore), dming lilac automatically~ ^-^

## install / config
this bot is written purely in cjs (boo..), and all the dependencies can be easily installed by running `npm install` in the folder root. the bot also expects to find a few things in its local .env, namely:

the `TOKEN` (discord bot token) and `CLIENT_ID` (discord bot client id)

you can also edit the `EMBED_COLOUR` as a hex value to make its default embed colour something different, as well as changing the `CACHE_WRITE_FREQUENCY` to however frequently you prefer (in ms).

## status

this bot was mainly maintained by sydney, but seeing as she hasn't been fronting anymore, i (lilac) have chosen to not maintain this bot myself. other features are quite broken and hard to work with, so i'd rather not continue development. 
