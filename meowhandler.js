//these are a list of things the bot can respond with, not actually things that it's searching for. see regex expression below
var nyaList = ['mrrp', 'mrrrp', 'mrrrrp', 'mrrrrrp', 'meow', 'nya', 'mrow', 'mrrow', 'mrrrow', 'mrrrrow', 'mew', 'purr', 'purrr', 'purrrr', 'purrrrr']; 
var nyaKaomoji = [' :3', ' >w<', ' >_<', ' >_<;;', ' >.<', ' (๑╹ω╹๑ )', ' ^^', `>.<<~`];
var unsureList = ['um,, ', 'uhh.. ', 'ettooo,. ']; //response intros for other animals - anne <3
var wonderlist = [`wo-wondahoyy..~`, `wonderhoy~!!`, `wondahoyyy!!! >_<`, `wonder... hoyyy!! >.<<~`, `wo-wonderhoy..?`, `minna~ isshonii ikuyo.. se~ no~ WONDAHOYYY~!!!`];

//these are the things that the bot actually matches to, woofList is an array of strings but the other two are arrays of regexes
var woofList = ['wan', 'woof', 'bark', 'arf'];
var nyaMatch = [/^(m(r{2,})p)/, /^(m(e+)(o+)w)/, /^(pu(r{2,}))/, /^(mew)/, /^(nya)/];
var yellingNyaMatch = [/^(M(R{2,})P)/, /^(M(E+)(O+)W)/, /^(PU(R{2,}))/, /^(MEW)/, /^(NYA)/];
var wonderhoyMatch = [/(wonderh(o+)(y+))/, /(wondah(o+)(y+))/];

function validMeow(isOtherAnimal) {
	let meowBack = nyaList[Math.floor(Math.random()*nyaList.length)]; //random selection of meow, but is sometimes the same (i think its fine tho :3)

	if (isOtherAnimal) { meowBack = unsureList[Math.floor(Math.random()*unsureList.length)]+meowBack; } //gets a random response from the unsurelist - anne

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
		return message.channel.send(validMeow(true));
	} else if (meowMessage.startsWith('KON')) {
		return message.channel.send(`${unsureList[Math.floor(Math.random()*unsureList.length)]} too loud >.<!!`); //foxes are a little scarier so thats why shes responding with !! - anne
	}

	if (/^(py(o+)n)/.test(meowMessage)) {
		return message.channel.send(validMeow(true));
	} else if ((/^(PY(O+)N)/.test(meowMessage))) {
		return message.channel.send(`${unsureList[Math.floor(Math.random()*unsureList.length)]} too loud >.<~~`); //bunnies are really really soft... so shes confused but very calm, hence the ~~ - anne
	}

	if (/^(gy(u+))/.test(meowMessage)) {
		return message.channel.send(`${unsureList[Math.floor(Math.random()*unsureList.length)]} water puppy,.? d-dont get water on me >_<~!! hiss~!!!`); //seals are a little scary because they can get you all wet.. - anne
	} else if ((/^(GY(U+))/.test(meowMessage))) {
		return message.channel.send("st-stop splashing water on me,~!! hisss!!!! >.< ");
	}

	let wonderArrayNum = 0;
	while (wonderArrayNum < wonderhoyMatch.length) {
		if (meowMessage.toLowerCase().includes(wonderhoyMatch[WonderArrayNum])) {
			return message.channel.send(wonderlist[Math.floor(Math.random()*wonderlist.length)]);
		}
		wonderArrayNum++;
	}
}

module.exports = {
	meowHandler
}
