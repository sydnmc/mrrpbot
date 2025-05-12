const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const intLimit = BigInt((2 ** 31)-1); //not Number.MAX_SAFE_INTEGER because setTimeout() works with 32 bit signed

function remind(userInteraction, isSlash) {
    	/* should accept: s/sec/second/seconds, m/min/minute/minutes, h/hr/hour/hours, d/day/days, w/wk/week/weeks, mon/month/months, y/yr/year/years */
		let reminder;
		let reminderContent = ''; //we use the whole text (matching every possible thing) and then have the actual reminder message after all of that
		let emptyReminderMessage = `s-sorry, but i can't remind you of nothing >_<;; please add a message to remind yourself of something >w<`;
		if (isSlash) {
			reminder = userInteraction.options.getString('reminder');
			let reminderTime = userInteraction.options.getString('time');
			if (reminder == undefined) {
				return userInteraction.reply(emptyReminderMessage);
			} else if (reminderTime == undefined) {
				return userInteraction.reply(`s-sorry, but you need to specify a timeframe to be reminded in >_<;;`);
			}
			reminder = reminderTime + reminder;
		} else {
			reminder = userInteraction.content.split('?remind')[1];
			reminderContent = '';
		}

		let waitTime = BigInt(0);
		let numMatch = /\d+/

		let checkList = [
			/\d+\s*(?:seconds?|sec|s)/g,
			/\d+\s*(?:minutes?|min|m)/g,
			/\d+\s*(?:hours?|hr|h)/g,
			/\d+\s*(?:days?|dy|d)/g,
			/\d+\s*(?:weeks?|wk|w)/g,
			/\d+\s*(?:months?|mon?)/g,
			/\d+\s*(?:years?|yr|y)/g
		];
		let multiplierList = [
			BigInt(1),
			BigInt(60),
			BigInt(60*60),
			BigInt(60*60*24),
			BigInt(60*60*24*7),
			BigInt(60*60*24*28),
			BigInt(60*60*24*365)
		]

		if (reminder.length == 0) {
			return userInteraction.channel.send(emptyReminderMessage); //has to be a text command, since we already checked above if slash commands are valid
		}

		for (let i = 0; i < checkList.length; i++) {
			let curMultiplier = multiplierList[i];
			let regex = checkList[i];
			if (regex.test(reminder)) {
				waitTime = waitTime + BigInt(parseInt(reminder.match(regex)[0].match(numMatch)[0]))*curMultiplier;
				reminderContent = reminder.split(reminder.match(regex)[0])[1]; //sets reminder content to everything after the current time match
			}
		}

		let timeOnMessage = Date.now();
		let futureTimestamp = Math.ceil(timeOnMessage/1000) + Number(waitTime);
		let initialRemind = new EmbedBuilder()
		.setTitle(`gotcha >w<`)
		.setDescription(`ill remind you <t:${futureTimestamp}:R> to ${reminderContent}!! :3`)
		.setColor('#3fc42d')

		if (!isSlash) {
			userInteraction.channel.send({embeds: [initialRemind]});
		} else {
			userInteraction.reply({embeds: [initialRemind]});
		}

		if (waitTime*BigInt(1000) < intLimit) {
			setTimeout(() => sendReminder(userInteraction, timeOnMessage, reminderContent, isSlash), Number(waitTime)*1000);
		} else {
			let remindTimestamp = new Date(Number(waitTime*BigInt(1000) + BigInt(timeOnMessage)));
			setTimeout(() => {
				if (Date.now() > remindTimestamp) {
					sendReminder(userInteraction, timeOnMessage, reminderContent, isSlash);
				}
			}, 60000); //runs every minute, we don't need to be too accurate when it comes to times months in advance
		}
}

function sendReminder(userInteraction, timeOnMessage, reminderContent, isSlash) {
	let remindEmbed = new EmbedBuilder()
	.setTitle(reminderContent)
	.setDescription(`<t:${Math.ceil(timeOnMessage/1000)}:R>`)
	.setColor('#e0cf4a')

	let authorId;
	if (!isSlash) {
		authorId = userInteraction.author.id;
	} else {
		authorId = userInteraction.user.id;
	}

	let reminderAfter = {content: `<@${authorId}>!! poke poke,, >_<`, embeds: [remindEmbed]};
	if (!isSlash) {
		return userInteraction.channel.send(reminderAfter);
	} else {
		return userInteraction.followUp(reminderAfter);
	}
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('reminds you of something, sometime in the future :0')
		.addStringOption(option =>
            option.setName('time')
                .setDescription('amount of time to wait for~'))
		.addStringOption(option =>
			option.setName('reminder')
				.setDescription('whatever you want to be reminded of >w<')),
    async execute(interaction) {
		await remind(interaction, true);
    },
	remind
};
