module.exports = (req, res, next) => {
    // console.log(req.url);
	
    const exceptions = [
        '/home',
        '/about',
        '/bug',
        '/assets',
        '/error',
        '/play',
        '/tools',
        '/api',
        '/statistics',
    ];

    let isException = false;
    exceptions.forEach (value => {
        const expr = new RegExp(value, 'gi');
        if (expr.test(req.url)) {
            isException = true;
            return;
        }
    });

    if (isException) {
        next ();
        return;
    }

    // running into a protected url
    // console.log(req.session.user);
	if (!req.session.user) {
        res.redirect ('/home?msg=go-home');
    } else {
        next ();
    }
};