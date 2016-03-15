Router.configure({
  layoutTemplate: "layout",
  loadingTemplate: "loading",
  notFoundTemplate: "notFound"
});

Router.route('/', {
  name:"wordGame",

  // waitOn: function() {
  //   return Meteor.subscribe('scores');
  // }
});
