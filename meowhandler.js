//these are a list of things the bot can respond with, not actually things that it's searching for. see regex expression below
var nyaList = ['mrrp', 'mrrrp', 'mrrrrp', 'mrrrrrp', 'meow', 'nya', 'mrow', 'mrrow', 'mrrrow', 'mrrrrow', 'mew', 'purr', 'purrr', 'purrrr', 'purrrrr']; 
var nyaKaomoji = [' :3', ' >w<', ' >_<', ' >_<;;', ' >.<', ' (๑╹ω╹๑ )'];

//these are the things that the bot actually matches to, woofList is an array of strings but the other two are arrays of regexes
var woofList = ['wan', 'woof', 'bark', 'arf'];
var nyaMatch = [/^(m(r{2,})p)/, /^(m(e+)(o+)w)/, /^(pu(r{2,}))/, /^(mew)/, /^(nya)/];
var yellingNyaMatch = [/^(M(R{2,})P)/, /^(M(E+)(O+)W)/, /^(PU(R{2,}))/, /^(MEW)/, /^(NYA)/];

function validMeow(isFox) {
	let meowBack = nyaList[Math.floor(Math.random()*nyaList.length)]; //random selection of meow, but is sometimes the same (i think its fine tho :3)

	if (isFox) { meowBack = "um,, "+meowBack; }

	let randomAdditions = Math.random();
	if (randomAdditions >= (2/3)) {
		meowBack = meowBack+"~?";
	} else if (randomAdditions <= (1/3)) {
		meowBack = meowBack+"~";
	}

	if (randomAdditions >= 0.25) { //will add kaomoji 25% of the time
		meowBack = meowBack+nyaKaomoji[Math.floor(Math.random()*nyaKaomoji.length)]
	}
	return meowBack;
}

function meowHandler(client, message) {
    let meowMessage = message.content;
	if (meowMessage.toUpperCase() != meowMessage) { //if not in all uppercase
		meowMessage = meowMessage.toLowerCase();
	}

	let nyaArrayNum = 0;
	while (nyaArrayNum < nyaMatch.length) {
		if (nyaMatch[nyaArrayNum].test(meowMessage)) {
			return message.channel.send(validMeow(false));
		} else if (yellingNyaMatch[nyaArrayNum].test(meowMessage)) {
			return message.channel.send("too loud >.<,,");
		}
		nyaArrayNum++;
	}

	let wanArrayNum = 0;
	while (wanArrayNum < woofList.length) {
		if (meowMessage.startsWith(woofList[wanArrayNum])) {
			return message.channel.send("im,, not sure how to bark >.<,,");
		} else if (meowMessage.startsWith(woofList[wanArrayNum].toUpperCase())){
			return message.channel.send("too loud >.<,, a-and,, i-i'm not sure how to bark ><");
		}
		wanArrayNum++;
	}

	if (meowMessage.startsWith('kon')) {
		return message.channel.send(validMeow(true))
	}
}

module.exports = {
	meowHandler
}
