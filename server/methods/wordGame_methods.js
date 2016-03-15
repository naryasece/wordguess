Meteor.methods({
  'getNewWord': function() {
    this.unblock();
    try {
      var result = HTTP.call("GET", "http://api.wordnik.com:80/v4/words.json/randomWord?hasDictionaryDef=true&minCorpusCount=10000&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=5&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5");
      // console.log(result);
      if(result && result.data && result.data.word) {
        return result.data.word.toLowerCase();
      } else {
        return false;
      }
    } catch(e) {
      return false;
    }
  },

  'randomizeWord':function(inputWord) {
    this.unblock();

    var letterPool = inputWord.split("");
    var randomWord = "";

    while(letterPool.length > 0) {
      var randomNumber = Math.floor(Math.random()*letterPool.length);
      randomWord += letterPool.splice(randomNumber, 1).join("");
    }
    console.log(inputWord, randomWord);

    return randomWord;

  },

  'startNewGameSession': function() {
    this.unblock();

    var firstWord = Meteor.call("getNewWord");
    // Generate a session ID to keep track of the user, considering we won't have
    // a logged in state.
    var sessionId = moment().unix().toString()+Random.id(10);
    var startTime = moment().toDate();
    console.log(firstWord, sessionId);
    if(firstWord) {
      gameScore.insert({
        sessionId:sessionId,
        score:0,
        currentWord: firstWord,
        previousWords:[],
        initials:'',
        startTime: startTime
      });

      var randomizedWord = Meteor.call("randomizeWord", firstWord);

      // TODO: have it return a scrambled version of the word to the client
      return {session:sessionId, word:randomizedWord, score: 0, startTime: startTime};

    } else {
      throw new Meteor.Error("Could not get a new word");
    }

  },
  'checkWord': function(word, sessionId) {
    this.unblock();
    console.log("checking word");
    console.log(word, sessionId);
    var oneMinuteBack = moment().subtract("1", "minute").toDate();
    var foundSession = gameScore.findOne({
      sessionId:sessionId,
      currentWord: word,
      startTime: {$gte: oneMinuteBack}
    });
    if(foundSession) {
      console.log("Successfully decoded the word!");
      var validatePoints = Random.id(20);
      gameScore.update({sessionId:sessionId}, {$set:{validatePoints: validatePoints}});

      // return a validation key so that users cannot score by calling the nextWord method from the client
      return validatePoints;
    } else {
      return false;
    }
  },

  'nextWord': function(sessionId, validatePoints) {
    this.unblock();
    var session = gameScore.findOne({sessionId:sessionId});
    console.log(session);

    if(session) {
      if(session.validatePoints && session.validatePoints === validatePoints) {

        // Update scores
        var score = session.score;
        score += session.currentWord.length;

        // Get the next word
        var nextGameWord = Meteor.call("getNewWord");

        // Save the previous word
        var previousWord = session.currentWord;

        gameScore.update({sessionId:sessionId}, {
          $set:{
            score:score,
            currentWord: nextGameWord
          },
          $push:{previousWords: previousWord}
        });

        var randomizedWord = Meteor.call("randomizeWord", nextGameWord);

        return {score:score, word:randomizedWord};
      } else {
        throw new Meteor.Error("Failed validation check");
      }

    } else {
      throw new Meteor.Error("Could not find session");
    }

  },
  'setInitials': function(sessionId, initials) {
    this.unblock();

    if(gameScore.find({sessionId:sessionId, startTime: {$lte:moment().toDate()}}).count() === 1) {
      gameScore.update({sessionId:sessionId}, {$set:{
        initials: initials
      }});

      return true;
    } else {
      return false;
    }
  }
});
