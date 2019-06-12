const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const {isAuthenticated} = require('../helpers/auth');
const fs = require('fs');
const mammoth = require('mammoth');
const pdf = require('html-pdf');
const Epub = require('epub-gen');
const htmlToText = require('html-to-text');
const randomInt = require('random-int');


const multer  = require('multer');
const storage = multer.diskStorage({
    destination: './images'
});
const upload = multer({storage: storage}).single('image');


//routes get
router.get('/', async (req, res) => {
	const articles = await Article.find().sort({date: 'desc'});
	res.render('articles/all-articles', { articles });
});
router.get('/articles/new-article', isAuthenticated, (req, res) => {
	res.render('articles/new-article');
});
router.get('/articles/read/:id', async (req, res) => {
	const article = await Article.findById(req.params.id);
	res.render('articles/read-article', {article});
});

//routes exports file
router.get('/articles/export/pdf/:id', async (req, res) => {
	const article = await Article.findById(req.params.id);
	const route = __dirname+'/../../pdf/'+req.params.id+'.pdf';
	const config = {
		"border": {
			"top": "3cm",
			"right": "3cm",
			"bottom": "2.5cm",
			"left": "2.5cm"
		}
	}
	pdf.create(article.body, config).toFile(route, function (err, response) {
        if (err) {
        	console.log(err);
        	return;
        }
		res.download(route);
    });
});

router.get('/articles/export/epub/:id', async (req, res) => {
	const article = await Article.findById(req.params.id);
	const route = __dirname+'/../../epub/'+req.params.id+'.epub';
	const option = {
        title: article.title,
        author: article.user,
        content: [{
                title: article.title,
                data: article.body,
            }
        ]
    };
    fs.open(route, 'w', function (err, file) {
		if (err) throw err;
		console.log('Saved!');
    	new Epub(option, route).promise.then(
    		() => res.download(route),
    		err => console.error("Failed to generate", err)
	    );
	});
});

router.get('/articles/export/text/:id', async (req, res) => {
	const article = await Article.findById(req.params.id);
	const route = __dirname+'/../../text/'+req.params.id+'.txt';	
	const text = htmlToText.fromString(article.body);
	if (text != null) {
		fs.writeFile(route, text, function (err) {
			if (err) throw err;
			console.log("Saved text into file");
			res.download(route);		
		});
	}
});


function transformAlign(element) {
    if (element.children) {
        element.children.forEach(transformAlign);
    }
    if (element.type === "paragraph") {
        if (element.alignment === "center") {
            element.styleName = "textCenter";
        } else if (element.alignment === "right") {
            element.styleName = "textRight";
        }
    }
    return element;
}

//routes post
router.post('/articles/new-article', isAuthenticated, async (req, res) => {
	const errors = [];

	const options = {
		transformDocument: transformAlign,
		styleMap: [
	        "p[style-name='textCenter'] => p.text-center:fresh",
	        "p[style-name='textRight'] => p.text-right:fresh"
	    ],
	    convertImage: mammoth.images.imgElement(function(image) {
	    	return image.read().then(function(imageBuffer) {
	    		var img = randomInt(10, 1000);
	    		fs.writeFile(
	    			__dirname+'/../public/images/'+req.files.body.md5+'/'+img+'.jpg',
	    			imageBuffer,
	    			'binary',
	    			function(err) {
	    				if(err) {
	                    	console.log(err);
	                	} else {
	                    	console.log("The file was saved!");
	                	}
	            }); 
	            return {
	                src: 'http://localhost:3000/images/'+req.files.body.md5+'/'+img+'.jpg'
	            };
	        });
	    })
	};
	
	if (!req.body.title || !req.files) {
		errors.push({text: 'Por favor, ingrese un título'});
	}
	if (errors.length > 0) {
		res.render('articles/new-article', {errors});
	} else {
		const { title } = req.body;
		const { image, body } = req.files;
		const routeFile = __dirname+'/../../uploads/'+body.md5+'.docx';
		const routeImage = __dirname+'/../public/images/'+image.md5+'.jpg';
		body.mv(routeFile, function(err) {
			image.mv(routeImage);
			fs.mkdir(__dirname+'/../public/images/'+body.md5, { recursive: true }, (err) => {
				if (err) console.log(err);
			});
			mammoth.convertToHtml({path: routeFile}, options)
			    .then(async (result) =>{
			        const body = result.value;
					const newArticle = new Article({
						title,
						body,
						image: image.md5,
						user: req.user.name
					});
					await newArticle.save();
			    }).done(async () => {
					req.flash('success_msg', 'Artículo registrado satisfactoriamente');
			    	res.redirect('/');
			    });
		});
	}
});

module.exports = router;