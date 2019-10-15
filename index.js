const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const fs = require("fs");
const getYoutubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");

var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));

const yt_api_key = config.yt_api_key;
const bot_controller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;

var queue = [];
var queueNames = [];
var isPlaying = false;
var dispatcher = null;
var Channel = null;
var skipReq = 0;
var skippers = [];
var stop = 0;
var n = 0;

client.login(discord_token);

client.on('message', function(message) {
  const member = message.member
  const mess = message.content.toLowerCase();
  const args = message.content.split(' ').slice(1).join(" ");

  if (mess.startsWith(prefix + "play")) {
    if (message.member.voiceChannel || Channel != null) {
      if (queue.length > 0 || isPlaying) {
        getID(args, function(id) {
          add_to_queue(id);
          fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            message.reply(" added to queue: **" + videoInfo.title + "**");
            queueNames.push(videoInfo.title);
          });
        });
      } else {
        isPlaying = true;
        getID(args, function(id) {
          queue.push(id);
          playMusic(id, message);
          fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            queueNames.push(videoInfo.title);
            message.reply(" now playing: **" + videoInfo.title + "**")
          });
        });
      }
    } else {
      message.reply(" you need to be in voice channel!");
    }
  } else if (mess.startsWith(prefix + "skip")) {
    if (skippers.indexOf(message.author.id) === -1) {
      skippers.push(message.author.id);
      skipReq++;
      if (skipReq >= 1) {
        skip_song(message);
        message.reply(" Your skip request has been acknowledged. Skipping Now")
      }
    }
  } else if (mess.startsWith(prefix + "queue")) {
    var message2 = "```";
    for (var i = 0; i < queueNames.length; i++) {
      var temp = (i + 1) + ": " + queueNames[i] + (i === 0 ? "**(Current Song)**" : "") + "\n";
      if ((message2 + temp).length <= 2000 - 3) {
        message2 += temp;
      } else {
        message2 += "```";
        message.channel.send(message2);
        message2 = "```";
      }
    }
    message2 += "```";
    message.channel.send(message2);
  } else if (mess.startsWith(prefix + "stop")) {
    if (message.guild.voiceConnection) {
      message.guild.voiceConnection.disconnect();
    } else {
      message.reply("I must be in a voice channel to leave one!");
    }
    stop = "yes";
  }

});




client.on('ready', function() {
  console.log("I am ready!")
});

function skip_song(message) {
  dispatcher.end();
}

function playMusic(id, message) {
  Channel = message.member.voiceChannel;
  if (stop !== "yes") {
    Channel.join().then(function(connection) {
      stream = ytdl("https://www.youtube.com/watch?v=" + id, {
        filter: 'audioonly'
      });
      skipReq = 0;
      skippers = [];

      dispatcher = connection.playStream(stream);
      dispatcher.on('end', function() {
        skipReq = 0;
        skippers = [];
        queue.shift();
        queueNames.shift();
        if (queue.length === 0) {
          queue = [];
          queueNames = [];
          isPlaying = false;
        } else {
          setTimeout(function() {
            playMusic(queue[0], message);
          }, 500);
        }
      });
    });
  }
}

function getID(str, cb) {
  if (isYoutube(str)) {
    cb(getYoutubeID(str));
  } else {
    search_video(str, function(id) {
      cb(id);
    });
  }
}

function add_to_queue(strID) {
  if (isYoutube(strID)) {
    queue.push(getYouTubeID(strID));
  } else {
    queue.push(strID);
  }
}

function search_video(query, callback) {
  request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
    var json = JSON.parse(body);
    if (!json.items[0]) callback("UOxkGD8qRB4");
    else {
      callback(json.items[0].id.videoId);
    }
  });
}

function isYoutube(str) {
  return str.toLowerCase().indexOf("youtube.com") > -1;
}
