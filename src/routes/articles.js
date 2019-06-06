const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const {isAuthenticated} = require('../helpers/auth');
const mammoth = require('mammoth');
const pdf = require('html-pdf');


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
	pdf.create(article.body).toFile(route, function (err, response) {
        if (err) {
        	console.log(err);
        	return;
        }
		res.download(route);
    });
});



function transformAlign(element) {
    if (element.children) {
        element.children.forEach(transformAlign);
    }
    if (element.type === "paragraph") {
    	console.log(element);
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
	const body = req.files.body;
	const { title, category } = req.body;
	const routeFile = __dirname+'/../../uploads/'+body.md5+'.docx';

	const options = {
		transformDocument: transformAlign,
		styleMap: [
	        "p[style-name='textCenter'] => p.text-center:fresh",
	        "p[style-name='textRight'] => p.text-right:fresh"
	    ],
	    convertImage: mammoth.images.imgElement(function(image) {
	        return image.read("base64").then(function(imageBuffer) {
	            return {
	                src: 'data:'+image.contentType+';base64,'+imageBuffer
	            };
	        });
	    })
	};
	
	if (!title || !category || Object.keys(req.files).length == 0) {
		console.log('No files were uploaded.');
	} else {
		body.mv(routeFile, function(err) {
			if (err){
				return res.status(500).send(err);
			}
			mammoth.convertToHtml({path: routeFile}, options)
			    .then(async (result) =>{
			        var html = result.value;
					const newArticle = new Article({title, category, body: html});
					newArticle.user = req.user.name;
					await newArticle.save();
			    }).done(async () => {
			    	res.redirect('/');
			    	console.log("saved");
			    });
		});
	}
});

module.exports = router;