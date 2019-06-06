const mongoose = require('mongoose');
const { Schema } = mongoose;

const ArticleSchema = new Schema({
	title: { type: String, required: true },
	body: { type: String, required: true },
	category: { type: String, required: true },
	user: { type: String, required: true },
	date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', ArticleSchema);

