const express = require('express');
const BackServices = require('../services/BackServices');
const Tools = require('../tools/Tools');
const router = express.Router();
const logger = require('../tools/logger').Create(__filename);

router.use (async (req, res, next) => {
    req.session.user = null; // do not destroy the session, just replace the user session
    req.session.editor = {
        seed : Tools.randomSeed ()
    };
    next ();
});

router.get ('/', async (req, res) => {
    res.redirect ('/tools/login');
});

router.get ('/login', async (req, res) => {
    let [error, message] = [req.query.error || '', req.query.message || ''];
	res.render('pages/editor-login', {
		error : error,
		message : message,
		copyright : new Date().getFullYear()
	});
});

router.post ('/login', async (req, res) => {
    const {password} = req.body;
    if (BackServices.validPassword (password)) {
        req.session.editor = {
            seed : Tools.randomSeed ()
        };
        res.redirect ('/tools/editor');
    } else {
        res.redirect ('/tools/login?error=Unauthorized');
    }
});

router.get ('/editor', async (req, res) => {
    let [error, message] = [req.query.error || '', req.query.message || ''];
    if (Tools.isEmpty(req.session.editor)) {
        res.redirect ('/tools/login?error=Unauthorized');
        return;
    }
	res.render('pages/editor', {
		error : error,
		message : message,
		copyright : new Date().getFullYear()
	});
});

module.exports = router;