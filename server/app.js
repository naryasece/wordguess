Meteor.publish("scores", function(){
  return gameScore.find({
      initials:{$ne:''},
      score:{$gt:0},
    },
    {
    fields: {
      initials:1,
      score:1
    },
    sort:{score:-1},
    limit:10}
  );
});
