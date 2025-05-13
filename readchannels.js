const fs = require('fs');

function filter(filterType, messagesList, message) {
    switch (filterType) {
        case "any":
            if ((message.fireReacts > 0 || message.tomatoReacts > 0 || message.sobReacts > 0) && (message.content.length > 0 || message.attachmentUrl)) {
                messagesList.push(message);
            }
            break;
        case "tomato":
            if (message.tomatoReacts > 0 && (message.content.length > 0 || message.attachmentUrl)) {
                messagesList.push(message);
            }
            break;
        case "sob":
            if (message.sobReacts > 0 && (message.content.length > 0 || message.attachmentUrl)) {
                messagesList.push(message);
            }
            break;
        case "fire":
            if (message.fireReacts > 0 && (message.content.length > 0 || message.attachmentUrl)) {
                messagesList.push(message);
            }
            break;
        case "none":
            if (message.content.length > 0 || message.attachmentUrl) {
                messagesList.push(message);
            }
            break;
    }
    return messagesList; //returns back the whole message list +1 message if we matched it
}

function readServerChannels(guildName, filterType, filterUser) {
    let messagesList = [];
    let channels = fs.readdirSync(`./messagecache/${guildName}`);

    channels.forEach(channel => {
        let channelData = JSON.parse(fs.readFileSync(`./messagecache/${guildName}/${channel}`));
        channelData.forEach(message => {
            if (filterUser != undefined) { //if we have a user to filter for
                if (filterUser == message.authorId) {
                    messagesList = filter(filterType, messagesList, message);
                }
            } else { //if we don't have any user we're looking for~
                messagesList = filter(filterType, messagesList, message);
            }
        });
    });

    return messagesList;
}

module.exports = {
    readServerChannels
}