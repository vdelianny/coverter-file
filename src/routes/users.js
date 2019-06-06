const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passport = require('passport');

//router get
router.get('/users/signin', (req, res) => {
	res.render('users/signin');
});

router.get('/users/signup', (req, res) => {
	res.render('users/signup');
});

router.get('/users/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out now.');
  res.redirect('/users/signin');
});

//router post
router.post('/users/signup', async (req, res) => {
	const { name, email, password, confirm_password } = req.body;
	const errors = [];
	if (name.length <= 0) {
		errors.push({text: 'ingrese un nombre'});
	}
	if (password != confirm_password) {
		errors.push({text: 'las contraseñas no coinciden'});
	}
	if (password.length < 4) {
		errors.push({text: 'la contraseña debe tener al menos 4 digitos'});
	}
	if (errors.length > 0) {
		res.render('users/signup', { errors, name, email, password, confirm_password })
	} else {
		const emailUser = await User.findOne({ email: email });
		if (emailUser) {
			req.flash('error_msg', 'el email ya existe');
			res.redirect('/users/signup');
		}
		const newUser = new User({ name, email, password });
		newUser.password = await newUser.encryptPassword(password);
		await newUser.save();
		req.flash('success_msg', 'Usuario registrado satisfactoriamente');
		res.redirect('/users/signin');
	}
});

router.post('/users/signin', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/users/signin',
	failureFlash: true
}));

module.exports = router;