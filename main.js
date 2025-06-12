/* websocket stuff - used for opening a connection with flanstore + yuru.ca backend :3 */
const WebSocket = require('ws');
const flanbridge = new WebSocket('ws://127.0.0.1:6767');
const yurubridge = new WebSocket('ws://127.0.0.1:7676');
const serverConnections = [
  { "name": "flanbridge", "socketData": flanbridge },
  { "name": "yurubridge", "socketData": yurubridge }
];

/* things used to download files in order to send them to flanstore~ */
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const flanstoreEndpoint = 'http://localhost:1402'; //since we're running on the same server~

/* discord.js imports */
const { Client, Events, GatewayIntentBits, Partials, Collection, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');

const { token, embedColor, cacheWriteFrequency } = require('./config.json');
const { frontHandler } = require('./commands/front.js');
const { remind } = require('./commands/remind.js');
const { meowHandler } = require('./meowhandler.js');
const { readServerChannels } = require('./readchannels.js');
const { randomQuote } = require('./commands/quote.js');
const { helpMessage } = require('./commands/help.js');
const { uploadFile } = require('./commands/upload.js');
const { doDiffLogic, addDiff } = require('./commands/diff.js');


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

var cacheRestartPrimed = false;
var editDiffPrimed = false;

client.commands = new Collection();

var commandList = fs.readdirSync('./commands/');
commandList.forEach(file => {
	const command = require(`./commands/${file}`); //requires the file, so loading it in
	if ('data' in command && 'execute' in command) { //making sure that it has a data and execute property (needed for slash commands)
		client.commands.set(command.data.name, command); //if so, we pass it along to discord.js~
	} else {
		console.log(`\x1b[33m${file} doesnt seem to have a 'data' or 'execute' property >_<;; gomen,,\x1b[0m`);
	}
});

function formatMessage(msg) {
	fireReacts = msg.reactions.resolve('🔥')?.count || 0; //if we can't resolve it, it just gets set back to 0
	tomatoReacts = msg.reactions.resolve('🍅')?.count || 0;
	sobReacts = msg.reactions.resolve('😭')?.count || 0;

	let attachUrl;
	if (msg.attachments.first()) {
		attachUrl = msg.attachments.first().attachment;
	}
	let formattedMessage = {
		channelId: msg.channelId,
		guildId: msg.guildId,
		id: msg.id,
		authorId: msg.author.id,
		content: msg.content,
		attachmentUrl: attachUrl,
		fireReacts,
		tomatoReacts,
		sobReacts
	};

	return formattedMessage;
}

async function storeServerMessages(curGuildId, guildName) {
	/* while caching the server info works fine, this means that the bot has to reload the entire cache whenever it goes offline */
	console.log(`started caching messages from ${guildName} :0`);
	let guildChannels = client.guilds.cache.get(curGuildId).channels.cache.values();
	let guildChannelsArray = Array.from(guildChannels);
	for (let i = 0; i < guildChannelsArray.length; i++) {
		let channel = guildChannelsArray[i];
		try {
			if (channel.type == 0) { //if it's a text channel, and only a text channel
				let messages = [];
				let message = await channel.messages
				.fetch({ limit: 1 }) //only fetches that one message
				.then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null)); //ion really get allat

				while (message) {
					await channel.messages
					  .fetch({ limit: 100, before: message.id })
					  .then(messagePage => {
						messagePage.forEach(msg => {
							let formattedMessage = formatMessage(msg)
							messages.push(formattedMessage);
						});
						// Update our message pointer to be the last message on the page of messages
						message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
					});
				}

				if (!fs.existsSync(`./messagecache/${channel.guild.name}`)) {
					fs.mkdirSync(`./messagecache/${channel.guild.name}`, { recursive: true });
				}

				fs.writeFile(`./messagecache/${channel.guild.name}/${channel.id}.json`, JSON.stringify(messages, null, 2), function (err) {
					if (err) console.log(err);
					console.log(`wrote ${messages.length} messages to ${channel.guild.name}'s #${channel.name}.json >w<`)
				});
			}
		} catch {
			console.log(`\x1b[33mfetching messages from ${channel.guild.name}'s #${channel.name} failed, likely due to missing access >_<;; gomen,,\x1b[0m`);
		}
	}
}

var messagesToWrite = {};

function updateCacheWhileRunning(message, isReaction, emoji) {
	let fileName = `./messagecache/${message.guild.name}/${message.channel.id}.json`;
	if (!messagesToWrite[message.channel.id]) { //this means old messages won't have reactions updated for now, but i'm okay with this for tonight
		messagesToWrite[message.channel.id] = [formatMessage(message)];
		setTimeout(() => {
			let currentChannelData;
			try {
				currentChannelData = JSON.parse(fs.readFileSync(fileName));
			} catch {
				currentChannelData = [];
			}
			messagesToWrite[message.channel.id].forEach(message => {
				let isDuplicate = false
				for (let i = 0; i < currentChannelData.length; i++) {
					if (currentChannelData[i].id == message.id) {
						currentChannelData[i] = message;
						isDuplicate = true;
						console.log(`	found a duplicate, so i'm updating an old reaction~ ehe~`);
					}
				}
				if (!isDuplicate) {
					currentChannelData.push(message);
				}
			});

			let guildDirectory = `./messagecache/${message.guild.name}`;
			if (!fs.existsSync(guildDirectory)) {
				fs.mkdirSync(guildDirectory, { recursive: true }); //if the server directory doesn't already exist, we wanna make it :p
			}
			fs.writeFile(fileName, JSON.stringify(currentChannelData, null, 2), (err) => {
				if (err) throw err;
				console.log(`updated cache for ${message.guild.name}'s #${message.channel.name} with new messages >w<`);
			});
			delete messagesToWrite[message.channel.id]; //removes the channel from messagesToWrite, effectively resetting it
		}, cacheWriteFrequency); //runs every 60 seconds by default
	} else {
		if (isReaction) {
			messagesToWrite[message.channel.id].forEach(entry => {
				if (entry.id == message.id) {
					switch (emoji) {
						case '🔥':
							entry.fireReacts++;
							break;
						case '🍅':
							entry.tomatoReacts++;
							break;
						case '😭':
							entry.sobReacts++;
							break;
					}
				}
			});
		} else {
			messagesToWrite[message.channel.id].push(formatMessage(message));
		}
	}
}

var currentlyOpenButtons = 0;
var userStorage = [];

for (let i = 0; i < serverConnections.length; i++) {
  serverConnections[i].socketData.on('open', () => {
    console.log(`connected to ${serverConnections[i].name} :0 she's so cute,,`);
  });

  serverConnections[i].socketData.on('close', () => {
    console.log(`disconnected from ${serverConnections[i].name} ;w; mouu.., `);
  });

  serverConnections[i].socketData.on('error', () => {
    console.log(`\x1b[33ms-something went wrong with ${serverConnections[i].name},, this could be because you launched me without her!! >_<;;\x1b[0m`);
  });
}

client.once(Events.ClientReady, readyClient => {
	console.log(`poke poke,, logged in on ${readyClient.user.tag} >w< nya~?`);

  flanbridge.on('message', message => {
	message = JSON.parse(message);
	if (message.type === "userAdd") {
	  let userCreateEmbed = new EmbedBuilder()
		.setTitle("new user wants to join flanstore!! :0")
		.setColor("#c17342")
		.addFields(
		  {name: 'discord handle', value: `@${message.userDiscord}`},
		  {name: 'subdomain', value: message.subdomain}
		)

		let acceptButton = new ButtonBuilder()
		  .setCustomId('accept-'+currentlyOpenButtons) //makes it so we can always keep track of how many buttons are open :3
		  .setLabel('accept >w<')
		  .setStyle(ButtonStyle.Success)
		let denyButton = new ButtonBuilder()
		  .setCustomId('deny-'+currentlyOpenButtons)
		  .setLabel('deny ;w;')
		  .setStyle(ButtonStyle.Danger)
		currentlyOpenButtons++;
		userStorage.push(message);

		let buttonRow = new ActionRowBuilder().addComponents(acceptButton, denyButton);
		client.users.send('245588170903781377', { embeds: [userCreateEmbed], components: [buttonRow] }); //i'd like to add a pfp option in flanstore before you sign up ^-^
	  }
	});
});

var curMap = {};
var curEditApiData = [];
var curEditDiff = {};
var curEditDiffIndex;

function followupYuruMessage(diffChannel) {
  yurubridge.on('message', message => {
    let parsedMessage = JSON.parse(message);
    let diffname;
    let colour;
    if (!parsedMessage.diffname) { //we also don't have a diff colour if this is the case~
      diffname = 'not set yet >_<;;';
      colour = embedColor; //stupid sydney with color and not colour,,
    } else {
      diffname = `${parsedMessage.diffname} (${parsedMessage.sr} stars)`;
      colour = parsedMessage.colour;
    }

    let diffEmbed = new EmbedBuilder()
		.setTitle("is this right? :0")
		.setColor(colour)
		.setImage(parsedMessage.bgLink)
		.addFields(
		  {name: 'song', value: `${parsedMessage.artist} - ${parsedMessage.title}`},
		  {name: 'diff', value: diffname},
			{name: 'mapper', value: parsedMessage.mapper},
			{name: 'status', value: parsedMessage.status}
		)

		let acceptButtonLilac = new ButtonBuilder()
		  .setCustomId('accept-map-lilac') //should only be 1 open at a time, since we're not gonna be spamming maps ehe
		  .setLabel("+ -> lilac's site~! <3")
		  .setStyle(ButtonStyle.Success)
		let acceptButtonSydney = new ButtonBuilder()
		  .setCustomId('accept-map-sydney')
		  .setLabel("+ -> sydney's site~! <3")
		  .setStyle(ButtonStyle.Success)
		let editButton = new ButtonBuilder()
		  .setCustomId('edit-map')
		  .setLabel('edit :0')
		  .setStyle(ButtonStyle.Primary)
		let cancelButton = new ButtonBuilder()
		  .setCustomId('cancel-map')
		  .setLabel('cancel ;w;')
		  .setStyle(ButtonStyle.Danger)
		let buttonRow = new ActionRowBuilder().addComponents(acceptButtonLilac, acceptButtonSydney, editButton, cancelButton);

    curMap = parsedMessage;
    return diffChannel.send({ embeds: [diffEmbed], components: [buttonRow] });
  });
}

function followupEditYuruMessage(channel, siteInfo, type, page) {
  curEditApiData = siteInfo;

  let options = [];
  for (let i = 0; i < siteInfo.length; i++) {
    if (type === "gds") {
      for (let j = 0; j < siteInfo[i].difficulties.length; j++) { //we can have multiple difficulties in one map~
        options.push(new StringSelectMenuOptionBuilder()
          .setLabel(`${siteInfo[i].songName} by ${siteInfo[i].mapper}`)
          .setDescription(`${siteInfo[i].diffname}`) //needs a string here
          .setValue(`diff-${i}-${j}`))
      }
    } else if (type === "sets") {
      options.push(new StringSelectMenuOptionBuilder()
        .setLabel(`${siteInfo[i].setTitle}`)
        .setValue(`set-${i}`))
    }
  }

  let optLen = options.length;
  let pageEnd = optLen;
  let pageStart = 0;
  if (optLen > 25) {
    pageEnd = page * 25;
    pageStart = (page - 1) * 25;
    if (pageEnd > options.length) { //if we exceed the bounds of the array with the page (page is less than 25 long)
      pageEnd = options.length;
    }

    options = options.slice(pageStart, pageEnd);
  }

  let mapSelect = new StringSelectMenuBuilder()
			.setCustomId(`${type}-selection`)
			.setPlaceholder('select a diff to edit~')
			.addOptions(options)
  let selectRow = new ActionRowBuilder().addComponents(mapSelect);

	return channel.send({ content: `(displaying ${type} ${pageStart}-${pageEnd}, out of a total ${optLen})`, components: [selectRow] });
}

client.on(Events.MessageCreate, async message => {
	//even if we don't have any commands, we still wanna write it to the cache!! :3
	updateCacheWhileRunning(message, false);
	if (message.author.bot) return false; //if we get a message from a bot (either ourselves or another bot like pluralkit), ignore for commands

	/* fronting!! :3 */
	//works in a different file >_<
	if (message.content.startsWith('?front')) {
		try {
			frontHandler(message);
		} catch(err) {
			console.log(`\x1b[33msomething went wrong executing ?front,, >_<;; \x1b[0m`);
			console.log(err);
		}
	}

	/* meowing back >w< */
	//works in a different file >_<
	meowHandler(client, message);

	/* remind mee :3 */
	//works in a different file >_<
	if (message.content.substring(0, 7) == '?remind') { //makes sure it's exactly ?remind
		try {
			remind(message);
		} catch(err) {
			console.log(`\x1b[33msomething went wrong executing ?remind,, >_<;; \x1b[0m`);
			console.log(err);
		}
	}

	/* quotes!! */
	//works in a different file >_<
	if (message.content.startsWith('?quote')) {
		try {
			randomQuote(message, false);
		} catch(err) {
			console.log(`\x1b[33msomething went wrong executing ?quote,, >_<;; \x1b[0m`);
			console.log(err);
		}
	}

	/* help!! >_<;; */
	//works in a different file >_<
	if (message.content == '?help') {
		helpMessage(message.channel, false);
	}

	/* uploading :OO */
	//works in a different file >_<
	if (message.content == '?upload') {
		let fileUploadInfo = uploadFile(message, false); //this returns a fileUrl, from which we can poke poke the flanstore api >w<
		let { data: fileBuffer } = await axios.get(fileUploadInfo.fileUrl, { responseType: 'arraybuffer', }); //returns a buffer of the file from the url using axios :3

		//with that file buffer, we need to (unfortunately) send a FormData...
    let file = new FormData();
    file.append('file', fileBuffer, {
      filename: fileUploadInfo.fileName,
      contentType: 'application/octet-stream',
      knownLength: fileBuffer.length
    });
    file.pipe(fs.createWriteStream('./test-upload.txt'));
    file.on('end', () => console.log('form finished'));

		let flanstoreUrl = await axios.post(`${flanstoreEndpoint}/upload`, file, {
          headers: {
            ...file.getHeaders(), //adds silly headers from the form
            'Authorization': fileUploadInfo.apiKey,
            'X-User': fileUploadInfo.user
          }
    });
    return message.channel.send(`uploaded file successfully~ >w< here's the link,,: ${flanstoreUrl}`); //still broken on the backend
	}

	/* diff modification >_<!! */
	//partially works in a different file :O slash commands do, at least,,
	if (message.content.startsWith('?site ')) {
    userParams = message.content.split('?site ')[1];
    if (message.author.id === "245588170903781377") { //lilac~
      if (!userParams) {
        return message.channel.send('y-you need to specify what action to do >_<;;');
      } else if (userParams.startsWith('diffadd')) {
        let diffLink = userParams.split('diffadd ')[1];
        yurubridge.send(JSON.stringify({ "link": diffLink, "type": "diff" }));
        followupYuruMessage(message.channel); //will wait for yuru.ca to get back to us, and follow up in a later message~
        return;
      } else if (userParams.startsWith('setadd')) {
        let setLink = userParams.split('setadd ')[1];
        yurubridge.send(JSON.stringify({ "link": setLink, "type": "set" }));
        followupYuruMessage(message.channel);
        return;
      } else if (userParams.startsWith('diffedit')) { //each of these should grab their respective info from api.yuru.ca :3
        let siteInfo;
        if (userParams.includes('lilac') || userParams.includes('sydney')) {
          let person;
          if (userParams.includes('sydney')) {
            person = 'sydney';
            userParams = userParams.split('sydney')[1];
          } else if (userParams.includes('lilac')) {
            person = 'lilac';
            userParams = userParams.split('lilac')[1];
          }

          let yuruApiInfo = await fetch(`https://api.yuru.ca/gds?person=${person}`);
          siteInfo = await yuruApiInfo.json();

          let page = 1;
          if (userParams) { //splitting normally with nothing else, we get an empty string - but otherwise, we should get " num"
            page = parseInt(userParams.substring(1));
          }

          followupEditYuruMessage(message.channel, siteInfo, "gds", page);
          return;
        } else {
          return message.channel.send(`l-looks like you didn't include which user to edit gds for,, >_<;;`);
        }
      } else if (userParams.startsWith('setedit')) {
        let yuruApiInfo = await fetch(`https://api.yuru.ca/sets`);
        siteInfo = await yuruApiInfo.json();

        let page = 1;
        userParams = userParams.split('setedit')[1]
        if (userParams) {
          page = parseInt(userParams.substring(1));
        }

        followupEditYuruMessage(message.channel, siteInfo, "sets", page);
      }
    } else {
      return message.channel.send(`i'm sorry, but,, i don't trust you to edit things on yuru.ca >.< only lilac and sydney can,, >_<;;`);
    }
	}

  if (editDiffPrimed && message.author.id === "245588170903781377" && message.content.startsWith(';edit')) {
    //let's enter edit mode~ :D
    try {
      let userParams = message.content.split(';edit ')[1];
      let editNum = parseInt(userParams.split(' ')[0]);
      let editValue = userParams.split(' ')[1];

      switch (editNum) {
        case 1:
          curEditDiff.difficulties[curEditDiffIndex] = editValue;
          break;
      }
    } catch {
      return message.channel.send("d-doesn't look like this is a properly formed edit, please try again >_<;;");
    }
  }

	/* message caching */
	if (message.content == "?refreshcache") {
		cacheRestartPrimed = true;
		return message.channel.send("u-um,, are you sure? this may take a little while, a-and it requires a lot of resources too...\nb-but!! if it's your first time doing this, then it will mean the cache will persist through bot restarts!! >.<\n\nonly sydney should really be doing this, s-so i only trust her to give me the magic word for right now...\n-# or lilac if you're here too.. i trust you too!!");
	}

	if (cacheRestartPrimed && message.content == "yes" && (message.author.id == '226885796739678229' || message.author.id == '245588170903781377')) {
		message.channel.send('sure thing!! h-here goes nothing.. >_<');
		let cacheStartTime = performance.now();
		await storeServerMessages(message.guildId, message.guild.name);
		cacheRestartPrimed = false;
		let cacheEndTime = performance.now();
		let cacheTotalTime = (Math.ceil(cacheEndTime) - Math.ceil(cacheStartTime))/1000;
		if (cacheTotalTime > 60.000) {
			cacheTotalTime = `${Math.round(cacheTotalTime/60)}m ${Math.round(cacheTotalTime%60)}s`;
		} else {
			cacheTotalTime = `${cacheTotalTime}s`
		}
		return message.channel.send(`<@${message.author.id}>!! <@${message.author.id}>!! i-i finished caching everything! i-it took ${cacheTotalTime}~`);
	}

	/* fire... */
	if (message.content == '?startfire') {
		//will also want a way to automatically store things we read from the cache into the discord.js cache...? but thats complicated uuu >_<
		let fireMessages = readServerChannels(message.guild.name, true);

		let fireStarter = new EmbedBuilder()
		.setTitle('y-you guys send a lot of funny things in this server,,')
		.setDescription('heres what you thought was the best >.<')
		.setThumbnail(message.guild.iconURL())
		.setColor('#FF9C48')

		message.channel.send({ embeds: [fireStarter] });

		fireMessages = fireMessages.sort((a, b) => b.fireReacts - a.fireReacts);
		let maxFireLen = 10;
		if (fireMessages.length < 10) { maxFireLen = fireMessages.length; }
		for (let i = 0; i < maxFireLen; i++) {
			let msgContent;
			if (fireMessages[i].content.length > 255) {
				msgContent = fireMessages[i].content.substring(0, 252)+'...';
			} else {
				msgContent = fireMessages[i].content;
			}

			let fireEmbed = new EmbedBuilder()
			.setTitle(msgContent)
			.setColor(embedColor)
			.setImage(fireMessages[i].attachmentUrl)
			.addFields(
				{name: '', value: `🔥 ${fireMessages[i].fireReacts}`, inline: true},
				{name: '', value: `sent by <@${fireMessages[i].authorId}> | [link](https://discord.com/channels/${fireMessages[i].guildId}/${fireMessages[i].channelId}/${fireMessages[i].id})`}
			)

			message.channel.send({ embeds: [fireEmbed] });
		}
	}

	/* :OOOO AI integration??? */
  if (message.channel.type === 11 && message.channel.ownerId === "1340778139886031008") { //if we're in a thread created by ourselves (ai stuff :3)
    return await handleThreadMessages(message.channel, { role: "user", content: `${message.author.globalName}: ${message.content}` });
  }
	if (message.content.startsWith('<@1340778139886031008>')) {
	  //first, we wanna create a new thread - so she has all the possible context >.<
		let pingMessage = message.content.split('>')[1];
    if (message.channel.type === 0) { //normal text channel
      let newMessageThread = await message.channel.threads.create({
        name: pingMessage,
        reason: pingMessage
      });
      return await handleThreadMessages(newMessageThread, { role: "user", content: `${message.author.globalName}: ${pingMessage}` }); //kills processing the message too, since we return twice~
    }
	}
});

let aiContext = [];
async function handleThreadMessages(thread, message) {
  let curThread = aiContext.findIndex(obj => obj.thread === thread); //gives us the thread index :3
  console.log(curThread);

  if (curThread !== -1) {
    aiContext[curThread].messages.push(message);
    console.log(aiContext[curThread].messages);
  } else {
    aiContext.push({ thread, messages: [message] });
    curThread = aiContext.findIndex(obj => obj.thread === thread); //this should exist now :3
  }

  //ping endpoint for our awesome ai shit :3
  let aiResponse = await fetch(`http://127.0.0.1:3232/v1/chat/completions`, { //should be perfectly fine, since we're using localhost here
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: aiContext[curThread].messages }),
  });
  aiResponse = await aiResponse.json();

  aiContext[curThread].messages.push(aiResponse.choices[0].message);
  return thread.send(aiResponse.choices[0].message.content);
}

client.on(Events.MessageReactionAdd, async (reaction) => {
	if (reaction.partial) { //sometimes discord decides to be bitchy and bratty and we need to correct it 💢
		//god i am so sorry for that comment it is 1:51 am and ive been working on this shit all day
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('*sigh* i hate discord sometimes,, this reaction,, um.., ', error);
			return;
		}
	}
	//ok now, we find where we need to add this reaction :3
	//because this involves writes to our huge files, this will work in tandem with the cache updater
	updateCacheWhileRunning(reaction.message, true, reaction._emoji.name);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) { //accept/deny buttons for flanstore + diffs
    await interaction.deferReply(); //we need to let discord know that we got their interaction, we're just gonna reply in a sec :3
    for (let i = 0; i < currentlyOpenButtons; i++) {
      if (interaction.customId === 'accept-'+i) {
          flanbridge.send(JSON.stringify({ "type": "userAdd", "userInfo": userStorage[i], "result": "accept" }));
          await interaction.editReply('got it!! >w< user added~ just make sure to set up their cloudflare tunnel + DNS settings for yuru.ca too, okay~,,?');
      } else { //only other option is deny, and using the customId seems to break things somehow :O
          flanbridge.send(JSON.stringify({ "type": "userAdd", "result": "deny" })); //we don't exactly need to send over a deny, but it's good to have anyways ^-^
          await interaction.editReply("o-okay,, :c i won't accept this user..,");
      }
      currentlyOpenButtons--;
      userStorage.splice(i, 1); //removes the user from storage too
    }

    /* normal add diff */
    if (interaction.customId === "accept-map-lilac") {
      yurubridge.send(JSON.stringify({ type: "acceptMapLilac", map: curMap })); //global + only supports one map at a time, but this is assuming i'll only add one map at a time already~
      await interaction.editReply("got it~! added map to lilac's map page >w<!!");
    } else if (interaction.customId === "accept-map-sydney") {
      yurubridge.send(JSON.stringify({ type: "acceptMapSydney", map: curMap }));
      await interaction.editReply("got it~! added map to sydney's map page >w<!!");
    } else if (interaction.customId === "edit-map") {
      //this lets us do a lot more :O

    } else if (interaction.customId === "cancel-map") {
      await interaction.editReply("o-okay,, :c i won't do anything further with this map..,");
    }
  }

  /* edit diff / set */
  if (interaction.customId === 'gds-selection') {
    let index = interaction.values[0].split('diff-')[1]; //gives us set-diff form (0-0)
    let setIndex = index.split('-')[0];
    let diffIndex = index.split('-')[1];

   	let diffEmbed = new EmbedBuilder()
		.setTitle(`${curEditApiData[setIndex].songName} by ${curEditApiData[setIndex].mapper}`)
		.setDescription(`reply with ;edit + the number of the value you want to edit + the new value you'd like to replace :3`)
		.setColor(embedColor)
		.setImage(curEditApiData[setIndex].bgLink)
		.addFields(
		  {name: 'diffname', value: curEditApiData[setIndex].difficulties[diffIndex]},
			{name: 'sr', value: `${curEditApiData[setIndex].starRatings[diffIndex]}`}, //stupid discord.js,,
			{name: 'amount mapped', value: curEditApiData[setIndex].amountsMapped[diffIndex]},
			{name: 'bns', value: `${curEditApiData[setIndex].bns[0]}, ${curEditApiData[setIndex].bns[1]}`},
		  {name: 'date finished', value: curEditApiData[setIndex].datesFinished[diffIndex]},
			{name: 'status', value: curEditApiData[setIndex].mapStatus},
		)

    //too many options to edit here, so we'll just use custom syntax, explained above >.<
    editDiffPrimed = true;
    curEditDiff = curEditApiData[setIndex];
    curEditDiffIndex = diffIndex;
    await interaction.reply({ embeds: [diffEmbed] });
  } else if (interaction.customId === 'sets-selection') {
    let index = parseInt(interaction.values[0].split('set-')[1]);

 	  let setEmbed = new EmbedBuilder()
		.setTitle(curEditApiData[index].setTitle)
		.setColor(embedColor)
		.setImage(curEditApiData[index].setBackgroundLink)
		.addFields(
		  {name: 'incomplete?', value: `${curEditApiData[index].incomplete}`}, //need to convert bool to string
		  {name: 'description', value: curEditApiData[index].setYapping}
		)

    let editTitle = new ButtonBuilder()
		  .setCustomId('set-edit-title')
		  .setLabel('edit title :0')
		  .setStyle(ButtonStyle.Secondary)
    let editDesc = new ButtonBuilder()
		  .setCustomId('set-edit-desc')
		  .setLabel('edit description :0')
		  .setStyle(ButtonStyle.Secondary)
    let changeCompleteStatus = new ButtonBuilder()
		  .setCustomId('set-change-status')
		  .setLabel('change status >.<')
		  .setStyle(ButtonStyle.Secondary)
		let cancelButton = new ButtonBuilder()
		  .setCustomId('cancel-set-edit')
		  .setLabel('cancel ;w;')
		  .setStyle(ButtonStyle.Danger)
		let buttonRow = new ActionRowBuilder().addComponents(editTitle, editDesc, changeCompleteStatus, cancelButton);

    await interaction.reply({ embeds: [setEmbed], components: [buttonRow] });
  }

	if (!interaction.isChatInputCommand()) return; //if it's not a chat input command at this point, then we don't need it :3
	let command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`\x1b[33m${interaction.commandName} doesnt seem to exist,, >_<;; gomen,,\x1b[0m`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(`s-ssomething happened while executing the last command, ${interaction.commandName} >_<;;\n${error}`);
		if (interaction.replied || interaction.deferred) {
			interaction.followUp({ content: 's-something bad happened while executing that command,,, >_<;; awawawa..', flags: MessageFlags.Ephemeral });
		}
	}
});

client.login(token);
