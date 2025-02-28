/* discord.js imports */
const { Client, Events, GatewayIntentBits, Partials, Collection, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');

const { token, embedColor, cacheWriteFrequency } = require('./config.json');
const { frontHandler } = require('./commands/front.js');
const { remind } = require('./commands/remind.js');
const { meowHandler } = require('./meowhandler.js');
const { readServerChannels } = require('./readchannels.js');
const { randomQuote } = require('./commands/quote.js');
const { helpMessage } = require('./commands/help.js');

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

client.once(Events.ClientReady, readyClient => {
	console.log(`poke poke,, logged in on ${readyClient.user.tag} >w< nya~?`);
});

client.on(Events.MessageCreate, async message => {
	//even if we don't have any commands, we still wanna write it to the cache!! :3
	updateCacheWhileRunning(message, false);
	if (message.author.bot) return false; //if we get a message from a bot (either ourselves or another bot like pluralkit), ignore for commands

	//message.channel.send('pemdas strikes fear in the hearts of many.');	

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

	/* >////< - misc ping easter eggs*/
	if (message.content.startsWith('<@1340778139886031008>')) {
		let pingMessage = message.content.split('>')[1];

		switch (pingMessage) {
			case '':
				return message.channel.send('h-hai..,?');
			case 'chu~':
				return message.channel.send('awawawa ><');
		}
	}
});

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
	if (!interaction.isChatInputCommand()) return;
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