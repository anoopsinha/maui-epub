var port = (process.env.VMC_APP_PORT || 3000);
var host = (process.env.VCAP_APP_HOST || 'localhost');
var express = require('express');
var fs = require('fs');
var EPubG = require('epub');
var app = express.createServer();


app.configure(function(){
	app.use(express.methodOverride());
	app.use(express.bodyParser());
	app.use(express.static(__dirname + '/public'));
	app.use(express.errorHandler({
		    dumpExceptions: true, 
			showStack: true
			}));
	app.use(app.router);
    });


// ===============================================================

function textOnly(html) {
    return html.replace(/<(?:.|\n)*?>/gm, '');
}


function saveJSON(filename, json) {
    filename = filename.replace(".epub", ".json");
    fs.writeFile(filename, json, function(err) {
	    if(err) {
		console.log(err);
	    } else {
		console.log("The file was saved! " + filename);
	    }
	})
}


function getChapterWrapper(title, number, id, epub, json_book, res) {
    return function() {
	epub.getChapter(id, function(err, data){
	    if(err){
              console.log(err);
              return;
            }

	    chapter = "CHAPTER #" + number + " :" + JSON.stringify(title);
            console.log(chapter);
	    story = textOnly(data);
            console.log(story); 
	    json_book.content.push({"chapter": chapter, "story": story});
	    if (number == epub.toc.length) {
   	      console.log(JSON.stringify(json_book));
	      ans = {"title": json_book.title, "book": json_book};
              endJSONMessage(res, JSON.stringify(ans));
	      saveJSON(json_book.filename, JSON.stringify(ans));
	    } 
         });
    }
}

function parseEpub(filename, res){
  var epub = new EPubG(filename, "/imagewebroot/", "/articlewebroot/");

  epub.on("error", function(err){
    console.log("ERROR\n-----");
    throw err;
  });

  epub.on("end", function(err){
    json_book = {};
    json_book.filename = filename;
    console.log("METADATA:\n");
    console.log(epub.metadata.title);
    json_book.title = epub.metadata.title;
    console.log(epub.metadata.creator);
    json_book.subtitle = epub.metadata.creator;
    json_book.content = [];


    for (i = 0; i < epub.toc.length; i++) {
        console.log(i);
	if (typeof epub.toc[i].title == 'string') {
          chapter_title = epub.toc[i].title;
	} else {
          chapter_title = "No Chapter Title";
	}
	getChapterWrapper(chapter_title, i + 1, epub.spine.contents[i].id, epub, json_book, res)();
    }  


  });

  epub.parse();
}




// ===============================================================


function endMessage(res, msg) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(msg);
    res.end('\n');
}

function endJSONMessage(res, msg) {
    res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});                         
    res.write(msg);
    res.end('\n');
}


var insert_book = function(req, res){
    story = req.body.story;  // already validated that this param exists
    endMessage(res, "Ok.");
}


var list_books = function(req, res){
    filenames = fs.readdirSync("./public");
    filenames2 = filenames.filter(function(str) {
            return checkSuffix(str, ".json");
	});
    console.log(filenames2);
    endMessage(res, JSON.stringify(filenames2));
}


function checkSuffix(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


var get_book = function(filename, res){
    console.log(filename);
    if (checkSuffix(filename, ".json")) {
	res.sendfile("./public/" + filename);
    } else if (checkSuffix(filename, ".epub")) {
      parseEpub("./public/" + filename, res);
      //endMessage(res, "ok");
    } else {
      endMessage(res, "Not an *.epub filename");
    }
}





app.post('/insert_book', function(req, res){
	console.log('/insert_book');
	if (typeof req.body.story == 'string') {
	    insert_book(req, res); 
	} else {
	    endMessage(res, "Count not insert_book.  Need story parameter.\n");
	}
    });


app.get('/get_book/:book', function(req, res){
        console.log('/get_book GET :book' + req.params.book);

        if (typeof req.params.book == 'string') {
   	   get_book(req.params.book, res);
 	} else {
	    endMessage(res, "Could not get book.\n");
	}
    });


app.get('/list_books', function(req, res){
        console.log('/list_books');
  	list_books(req, res);  
    });




app.listen(port);

