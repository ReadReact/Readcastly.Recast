require('dotenv').config();
const request = require('request');
const bodyParser = require('body-parser');
const Articles = require('./database/controllers/articlesController');
const Users = require('./database/controllers/usersController');
const utils = require('./utils.js');
const mercury = require('./apis/mercuryController');
const news = require('./apis/newsController');
const mailer = require('./apis/mailController');
const texter = require('./apis/textController');
const polly = require('./apis/pollyController');
const path = require('path');

// To be written and passed into routes between endpoint and function
// const isLoggedIn = function(){};

module.exports = function(app, express, passport) {

  app.post('/requrl', function(req, res) {
    // console.log('server.js received POST req at /requrl. req.body = ', req.body);
    mercury.parseAndSave(req.body.userId, req.body.requrl, true, function(result) {
      res.send(result);
    });
  });

  app.post('/quickStream', function(req, res) {
    mercury.parseAndSave(99, req.body.url, true, function(result) {
      polly.textToSpeech(utils.payloadBuilder(result),res, function(url, title) {
        console.log('SUCCESSFUL STREAM RETURN--url: ', url, 'title: ', title)
        res.send({url, title});
      });
    });
  });

  app.get('/getAll', function(req, res) {
    console.log('server.js received GET req at /getAll . Returning array of objects with contents of Readcastly db!');
    Articles.getAll(req.query.userId, function(library) {
      if (library.length === 0) {
        res.send('empty');
      } else {
        console.log('server/routes.js l 25, about to call utils.dbstats...'); // ***
        utils.dbStats(library); // ***
        var peskyCharacters = utils.textInspector(library);
      console.log('========(routes.js L-32) PESKY CHARACTERS: ', peskyCharacters); /* MH: DEBUGGING */
      // console.log('========Array.isArray(library): ', Array.isArray(library)); /* MH: DEBUGGING */
      // console.log('server/routes.js l 29, library sending to client = ', library); /* MH: DEBUGGING */
        res.send(library);
      }
    });
  });

  app.post('/deleteOne', function(req,res) {
    Articles.deleteOne(req.body.userId,req.body.url, function(deletedModel) {
      res.send({"deleted": req.body.url});
    });
  });

  app.post('/stream', function(req,res) {
    console.log('======BACK-A-routes.js-IN STREAM ENDPOINT');
    // console.log('PAYLOAD === ', req.body.payload);
    polly.textToSpeech(req, res, function(url, title) {
      console.log('SUCCESSFUL STREAM RETURN--url: ', url, 'title: ', title)
      res.send({url, title})
    });
  });

  app.post('/email', function(req,res) {
    // console.log('IN EMAIL ENDPOINT');
    // console.log('PAYLOAD === ', req.body.payload);
    mailer.sendMail(req,res,function(destination) {
      console.log(destination);
      res.send({"destination" : destination});
    });
  });

  app.post('/phone', function(req,res) {
    // console.log('IN PHONE ENDPOINT');
    // console.log('PAYLOAD === ', req.body.payload);
    texter.sendText(req,res,function(destination) {
      console.log('TEXT RES === ', destination);
      res.send({"destination" : destination})
    });
  });

  app.post('/link', function(req,res) {
    console.log('IN LINK ENDPOINT');
    // console.log('PAYLOAD === ', req.body.payload);
    polly.textToSpeech(req, res, function(url, title) {
      console.log('SUCCESSFUL STREAM RETURN--url: ', url, 'title: ', title)
      res.send({url, title})
    });
  });

  app.post('/topStories', function(req,res) {
    console.log('about to call top stories...');
    news.topStories(req.body.source, req.body.headlineMode, res);
  });

  app.post('/emailCheck', function(req,res) {
    Users.checkEmail(req.body.email, function(result) {
      res.send(result)
    });
  });

  app.get('/api/signup', function(req,res) {
      res.send('this is our signup page :)');
  });

  app.get('/api/login', function(req, res) {
    res.send(req.body);
  });

  // app.get('/api/', isLoggedIn, function(req, res) {
  //   console.log('RENDER INDEX')
  //   app.use(express.static(path.join(__dirname, '../client')));
  //   res.sendFile(path.join(__dirname, '../client/index.html'), {
  //     user: req.user,
  //   });
  // });

  app.post('/api/signup',
    passport.authenticate('local-signup', {
    successRedirect: '/#/app',
    failureRedirect: '/#/signup',
    failureFlash: true
  }))

  app.post('/api/login',
    passport.authenticate('local-login', {
    successRedirect: '/#/app',
    failureRedirect: '/#/',
    failureFlash: true
  }))

  app.get('/api/logout', function(req, res) {
    console.log('req.isAuthenticated() = ' + req.isAuthenticated());
    req.logout();
    console.log('req.isAuthenticated() is now ' + req.isAuthenticated());
    res.end('/login');
  })

  app.get('/api/getUserInfo', function(req, res) {
    console.log(req.user);
    res.send(req.user);
  })
  //route middleware to make sure a user is logged in
  function isLoggedIn(req, res, next) {
    if(req.isAuthenticated())
      return next();

    res.redirect('/#/splash');
  }

};

// other routes we wrote to test and may use in future:

// app.post('/requrl/:requrl', function(req, res) {
//   console.log('server.js, POST to /requrl/:requrl. l. 15: req received.');
//   let requrl = req.params.requrl;
//   console.log('server.js POST to requrl. l. 14. req.params.url = ', req.params.requrl);

// to test urlParser; will update to add authentication route when we get to that story
// app.post('/login', urlParser, function(req, res) {
//   console.log('server.js l. 16: received POST to /login. Will read it now...');
//   if(req.body === {}) {
//     console.log('server.js l. 18 - urlParser says body is empty on this request: ', req);
//     return res.sendStatus(400);
//   }
//   console.log('server.js l. 21. req.body = ', req.body);
//   console.log('server.js l. 22. req.body.username = ', req.body.username);
//   res.send('Welcome to Readcastly, ' + req.body.username + '! Nice to have you on board.');
// });

// to test bodyParser for json;
// app.post('/jsonTest', jsonParser, function(req, res) {
//   console.log('server.js l. 28: received POST to /jsonTest. Will read it now...');
//   console.log(req.body);
//   if(req.body === {}) {
//     console.log('server.js l. 30: jsonTest did not get an object to parse');
//     return res.sendStatus(400);
//   }
//   console.log('server.js l. 33: req.body should be an obj. body = ', req.body);
//   res.sendStatus(200);
// });


  // app.get('/topStories', function(req,res) {
  //   console.log('routes.js GET req to /topStories, l 37. req.query.sources = ', req.query.sources);
  //   var newsSources = [];
  //   var sourceFromClient = req.query.sources;
  //   if(req.query.sources === 'pull-from-api') {
  //     sourceFromClient = 'ars-technica';
  //     news.newsApiImport(function(apiSources){
  //       newsSources = apiSources});
  //   }
  //   // else {newsSources = req.query.sources}
  //   var options = {};
  //   // news.newsApiBuilder(req.body.sources[1], function(optionsObj){
  //   news.newsApiBuilder(sourceFromClient, function(optionsObj){
  //     options = optionsObj;
  //   });
  //   request(options, function(error, response, body) {
  //     console.log('\n\nroutes.js POST req to /topStories');
  //     var parsedNewsObj = JSON.parse(body);
  //     // console.log('\n\nroutes.js GET req to /topStories, l 48. res body.articles from newsApi = ', parsedNewsObj.articles);
  //     res.send(parsedNewsObj.articles);
  //   });
  // });
