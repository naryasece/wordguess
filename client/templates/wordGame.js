Template.wordGame.helpers({
  'currentWord':function() {
    if(Session.get("word")) {
      return Session.get("word");
    }

  },
  'currentLetter':function() {
    return this;
  },
  'currentGuess': function() {
    if(Session.get("wordGuess")) {
      return Session.get("wordGuess");
    }
  },
  'currentScore': function() {
    if(Session.get("score")) {
      return Session.get("score");
    }
  },
  'timeRemainingDisplay': function() {
    if(Session.get("timeRemaining")) {
      return Session.get("timeRemaining");
    }
  },
  'lastTenSeconds':function() {
    if(Session.get("timeRemaining") && Session.get("timeRemaining") < 10) {
      return "final-countdown";
    }
  },
  'currentSession': function() {
    if(Session.get('gameSession')) {
      return true;
    }
  }
});

Template.wordGame.events({
  'click  #start-new-game': function() {
    guessWordGame.startNewGame();
  },
  'animationend #player-guess': function() {
    $("#player-guess").removeClass("correct-word").removeClass("incorrect-word");
  }
});

Template.wordGame.onRendered(function(){

  $(document).on('keydown', function(e){
    console.log(e);
    e.preventDefault();
  });
  $(document).on('keyup',function(e) {
    console.log(e);
    e.preventDefault();
    console.log('KEYUP');
    // console.log(e.keyCode);

    // Check if there is an active session
    if(Session.get("gameSession")) {
      var availableCharacters = Session.get("word");
      var currGuess = [];
      if(Session.get("wordGuess")) {
        currGuess = Session.get("wordGuess");
      }

      // Delete key,
      if(e.keyCode === 8) {
        // If the user types the delete key, place the last character into the word array
        if(currGuess.length > 0) {
          availableCharacters.unshift(currGuess.pop().join(""));

          Session.set("wordGuess", currGuess);

          Session.set("word", availableCharacters);
        }
      } else {
        // Grab the key typed
        var key = String.fromCharCode(e.keyCode).toLowerCase();

        // If it is in the array, move it over to the guess
        if(availableCharacters && availableCharacters.indexOf(key) >= 0) {
          currGuess.push(
            availableCharacters.splice(availableCharacters.indexOf(key), 1)
          );
          Session.set("wordGuess", currGuess);

          Session.set("word", availableCharacters);

          // if availableCharacters is length 0, then we have used all the keys
          if(availableCharacters.length ===0) {
            Meteor.call("checkWord", currGuess.join(""), Session.get("gameSession"), function(err, resp) {
              console.log(err,resp);
              if(!err && resp) {
                $("#player-guess").addClass("correct-word");
                setTimeout(function() {
                  guessWordGame.getNextWord(resp);
                }, 300);

              } else if (!err && !resp) {
                $("#player-guess").addClass("incorrect-word");
              }
            });
          }
        }
      }
      // End regular key
    }
  });
});

Template.wordGame.onCreated(function(){

  guessWordGame = {
    getNextWord: function(validatePoints) {
      console.log("getNextWord");
      Meteor.call("nextWord", Session.get("gameSession"), validatePoints, function(err, resp){
        console.log("nextWord resp",err, resp);
        if(!err && resp) {
          Session.set('word', resp.word.split(""));
          Session.set('backupWord', resp.word); //just in case word gets goofed up.
          Session.set("wordGuess", "");
          Session.set("score", resp.score);
          $("#player-guess").removeClass("correct-word").removeClass("incorrect-word");
        }
      });
    },
    endTime:{},
    countDownTimer:{},
    startCountDown: function() {
      Session.set("timeRemaining", "60");
      guessWordGame.countDownTimer = Meteor.setInterval(function(){
        // console.log("countdown", moment().format("ss"), moment(guessWordGame.endTime).format('ss'));
        var diff = Math.floor(moment(guessWordGame.endTime).diff(moment())/1000);
        if(diff <= 0) {
          guessWordGame.stopCountDown();
          guessWordGame.gameOver();
          $("#overlay-game-over").modal("show");
        } else {
          Session.set("timeRemaining", diff);
        }

      }, 1000);
    },
    stopCountDown: function() {
      Meteor.clearTimeout(guessWordGame.countDownTimer);
    },
    gameOver: function() {
      Session.set("wordGuess", null);
      Session.set('word', null);
      Session.set("backupWord", null);
      // Session.set("gameSession", null);
    },
    startNewGame: function() {
      Meteor.call("startNewGameSession", function(err, resp){
        console.log(err, resp);
        if(!err) {
          Session.set('gameSession', resp.session);
          Session.set('word', resp.word.split(""));
          Session.set('backupWord', resp.word); //just in case word gets goofed up.
          Session.set("wordGuess", "");
          Session.set("score", resp.score);
          guessWordGame.endTime = moment(resp.startTime).add("61", "seconds").toDate();
          guessWordGame.startCountDown();
        } else {
          console.log("Error setting up new game");
        }
      });
    }

  };
});

Template.wordGame.onDestroyed(function() {
  // Unset global session variables
  Session.set("wordGuess", null);
  Session.set('word', null);
  Session.set("backupWord", null);
  Session.set("gameSession", null);
});

Template.overlayGameOver.helpers({
  highScoreInitialsError:function() {
    if(Session.get("highScoreInitialsError")) {
      return Session.get("highScoreInitialsError");
    } else {
      return false;
    }
  }
});

Template.overlayGameOver.events({
  'show.bs.modal' :function() {
    // $(document).off('keydown');
    Session.set("highScoreInitialsError", null);
  },
  'hide.bs.modal' : function() {
    // $(document).on('keydown', function(e){
    //   console.log(e);
    //   e.preventDefault();
    // });
    Session.set("gameSession", null);
  },
  'focus #player-initials': function() {
    $(document).off('keydown');
  },
  'blur #player-initials': function() {
    $(document).on('keydown', function(e){
      console.log(e);
      e.preventDefault();
    });
  },
  'click #initials-submit': function() {
    if(Session.get("gameSession")) {
      if($("#player-initials").val() && $("#player-initials").val().length > 0) {
        Session.set("highScoreInitialsError", null);
        Meteor.call("setInitials", Session.get("gameSession"), $("#player-initials").val(), function(err, resp) {
          if(!err) {
            $("#overlay-game-over").modal("hide");
            $("#player-initials").val("");
          }
        });
      } else {
        Session.set("highScoreInitialsError", "Please enter your initials to continue");
      }

    }

  }
});


Template.highScoreList.helpers({
  highScores: function() {
    return gameScore.find();
  },
  score: function() {
    return this.score;
  },
  initials: function() {
    return this.initials;
  }
});

Template.highScoreList.onCreated(function() {
  var instance = this;

  instance.autorun(function() {
    var subscription = instance.subscribe('scores');
    if(subscription.ready()) {
      console.log(">> subscripion of scores ready");
    }
  });

  instance.scores = function() {
    return gameScore.find();
  };
});
