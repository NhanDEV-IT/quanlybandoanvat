const requestLogger = (req, res, next) => {
    console.log('\n=== Start Request ===');
    console.log('Time:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    console.log('Params:', req.params);
    console.log('Headers:', {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
    });
    
    // Capture the original res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
        console.log('\n=== Response ===');
        console.log('Status:', res.statusCode);
        console.log('Data:', data);
        console.log('=== End Request ===\n');
        return originalJson.call(this, data);
    };

    next();
};

module.exports = requestLogger; 