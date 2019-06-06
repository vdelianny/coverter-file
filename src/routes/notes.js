const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const {isAuthenticated} = require('../helpers/auth');


//routes get

router.get('/notes/new', isAuthenticated, (req, res) => {
	res.render('notes/new-note');
});

router.get('/notes', isAuthenticated, async (req, res) => {
	const notes = await Note.find({user: req.user.id}).sort({date: 'desc'});
	res.render('notes/all-notes', { notes });
});

router.get('/notes/edit/:id', isAuthenticated, async (req, res) => {
	const note = await Note.findById(req.params.id);
	res.render('notes/edit-note', {note});
});


//routes post

router.post('/notes/new-note', isAuthenticated, async (req, res) => {
	const { title, description } = req.body;
	const errors = [];
	if (!title) {
		errors.push({text: 'por favor, ingrese un título'});
	}
	if (!description) {
		errors.push({text: 'por favor, ingrese una description'});
	}
	if (errors.length > 0) {
		res.render('notes/new-note', {
			errors,
			title,
			description
		})
	} else {
		const newNote = new Note({ title, description });
		newNote.user = req.user.id;
		await newNote.save();
		req.flash('success_msg', 'Nota agregada satisfactoriamente');
		res.redirect('/notes');
	}
});


//routes put
router.put('/notes/edit-note/:id', isAuthenticated, async (req, res) => {
	const { title, description } = req.body;
	await Note.findByIdAndUpdate(req.params.id, { title, description });
	req.flash('success_msg', 'Nota editada satisfactoriamente');
	res.redirect('/notes');
})


//routes delete
router.delete('/notes/delete/:id', isAuthenticated, async (req, res) => {
	await Note.findByIdAndDelete(req.params.id);
	req.flash('success_msg', 'Nota eliminada satisfactoriamente');
	res.redirect('/notes');
})


module.exports = router;