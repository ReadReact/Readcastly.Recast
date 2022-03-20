require('dotenv').config();
const request = require('request');
const newsApiSources = require('../database/collections/newsApi.json');
const Sources = require('../database/collections/sources');
const Source = require('../database/models/source');
// const mercury = require('./mercuryController');
const newMercury = require('@postlight/mercury-parser');
const Promise = require('bluebird');
const utils = require('../utils');

const newsApiImport = function (callback) {
  // newsApiSources.sources.forEach(function(source){
  //   Sources.create({
  //     name: source.name, // is this meant to be sources[0].name...url...id, etc.? Is that sample data from NewsAPI? (As of 4/11 no more source logos)
  //     homepage: source.url,
  //     most_read: source.id,
  //     image: urlsToLogos.medium
  //   })
  var storySourceOptions = {
    method: 'GET',
    url: 'https://newsapi.org/v1/sources',
    headers: {
      // 'x-api-key': process.env.NEWSAPI_KEY,
      'content-type': 'application/json'
    },
    qs: {
      // source: source.attributes.most_read,
      // source: 'ars-technica', // hardcode this for test; update with source user selects from list returned from API
      language: 'en'
    }
  };
  request(storySourceOptions, function (error, response, body) {
    console.log('\n\nnewsController GET req to newsApi sources');
    var parsedSourcesObj = JSON.parse(body);
    // console.log('\nnewsApi sources = ', parsedSourcesObj.sources); // LOTS
    callback(parsedSourcesObj.sources);
  })
  // .catch(function(error){console.log('ERROR pulling sources from NEWSAPI:', error);});
  // .then(function(source){console.log(source.id, source.name, "created");})
  console.log('NEWS API SOURCES SUCCESSSFULLY IMPORTED');
};

const newsApiBuilder = function (source, callback) {
  // new Source({id:sourceId}).fetch() // takes sourceId from client req & queries db; gets source id in newsapi format (e.g., "id": "abc-news-au")
  // .then(function(source) { // creates options obj so routes.js endpoint /topStories can make req to newsapi & res.send back to client; Andrew set up using newsAPI.json data but not tested yet
  var options = {
    method: 'GET',
    url: 'https://newsapi.org/v1/articles',
    headers: {
      'x-api-key': process.env.NEWSAPI_KEY,
      'content-type': 'application/json'
    },
    qs: {
      // source: source.attributes.most_read,
      // source: 'ars-technica', // hardcode this for test
      source: source,
      sortBy: 'top'
    }
  };
  callback(options);
  // })
  // .catch(function(error){console.log('ERROR BUILDING NEWSAPI REQUEST OBJ ', error);});
};

const topStories = function (source, headlineMode, res) {
  var options = {};
  newsApiBuilder(source, function (optionsObj) {
    options = optionsObj;
  });
  request(options, function (error, response, body) {
    let headlines = [];
    console.log('BEGINNING HEADLINES LENGTH === ', headlines.length);
    if (error) {
      console.log('ERROR GETTING GUEST STORIES FROM NEWSAPI ===', error);
    } else {
      var parsedNewsObj = JSON.parse(body);
      let collection = parsedNewsObj.articles.length;
      console.log('TOP STORIES FROM SERVER ===== ');
      parsedNewsObj.articles.forEach(function (article) {
        console.log(article.title);
      })
      console.log('PROPERTIES of Article Objects: ', Object.keys(parsedNewsObj.articles[0]));

      const bundler = function (article) {
        console.log('PROCESSED ARTICLE === ', article.title);
        if (article.error) {
          console.log('Error! Error!');
          collection--;
        } else {
          headlines.push(article);
        }
        // console.log('HEADLINES ARRAY: ', headlines);
        if (headlines.length === collection) {
          console.log('HEADLINES TO BE SENT BACK ==== ');
          headlines.forEach(function (article) {
            console.log(article.title);
          });
          res.send(headlines);
        }
        else {
          console.log('LENGTHS DO NOT MATCH');
        }
      };

      /* 
      SEARCHING FOR A PROMISE-BASED SOLUTION TO CODE BELOW, 
      IN ORDER SET TIMER LIMIT (e.g., 5 seconds) FOR EACH ARTICLE/URL TO RESPOND, 
      BEFORE SKIPPING IT AND PROCEEDING TO NEXT ARTICLE 
      */


      parsedNewsObj.articles.forEach(function (article) {
        console.log('ARTICLE BEING PROCESSED === ', article.title);

        newMercury.parse(article.url, { contentType: 'text' }).then(result => {
          // console.log('newMercury.parse -- RESULT: ', result);
          bundler(result);

          // mercury.parseAndSave(99, result.url, headlineMode, function(nextResult) {
          //   console.log('------> mercury.parseAndSave --- NEXT-RESULT: ', nextResult);
          //   bundler(nextResult);
          // );

        })
          .catch(function (err) {
            console.log('ERROR IN MERCURY PARSING', err);
          });

        // mercury.parseAndSave(99, article.url, headlineMode, function(result) {
        // console.log('results for : ', article.url, result.title)
        //   bundler(result);
        // });
      });

      /* UNSUCCESSFUL ATTEMPTS AT PROMISE-BASED SOLUTION */

      /* ATTEMPT: WITH BLUEBIRD .TIMEOUT */
      // let mercuryParsePromise = Promise.promisify(mercury.parseAndSave);
      // mercuryParsePromise(99, article.url, headlineMode, function(result) {
      //     return result;
      //   })
      // // })
      // .timeout(5000)
      // .then(function(result) {
      //   bundler(result);
      // })
      // .catch(Promise.TimeoutError, function(err) {
      //   console.log(utils.errors.mercuryTimeout); 
      // });
      // continue;

      /* ATTEMPT: WITH BLUEBIRD PROMISE.TRY AND .TIMEOUT */
      // for (let i = 0; i < parsedNewsObj.length; i++) {
      //   Promise.try(function(article) {
      //     return mercury.parseAndSave(99, article.url, headlineMode, function(result) {
      //       return result;
      //     })
      //     .timeout(5000)
      //     .then(function(result) {
      //       bundler(result);
      //     })
      //     .catch(Promise.TimeoutError, function(err) {
      //       console.log(utils.errors.mercuryTimeout); 
      //     });
      //   });
      // } 

    }
  });
}


module.exports = { newsApiImport, newsApiBuilder, topStories };
