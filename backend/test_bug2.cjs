const http = require('http');

const data = JSON.stringify({ email: 'test@example.com', password: 'password123' });

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/v1/auth/test-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const token = JSON.parse(body).token;
    console.log("Token:", token);
    
    // Create block
    const postData = JSON.stringify({
      title: 'Test Block',
      startTime: '2025-01-01T12:00:00.000Z',
      endTime: '2025-01-01T13:00:00.000Z',
      isRecurring: true,
      recurrenceRule: { frequency: 'DAILY' },
      date: '2025-01-01'
    });
    const postOpts = {
      hostname: '127.0.0.1', port: 5000, path: '/api/v1/planner', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    };
    const req2 = http.request(postOpts, res2 => {
      let b2 = '';
      res2.on('data', d => b2 += d);
      res2.on('end', () => {
        const masterId = JSON.parse(b2).data._id;
        console.log("Created:", masterId);
        
        // Patch block
        const patchData = JSON.stringify({
          editScope: 'SINGLE', exDate: '2025-01-02',
          startTime: '2025-01-02T14:00:00.000Z', endTime: '2025-01-02T15:00:00.000Z'
        });
        const patchOpts = {
          hostname: '127.0.0.1', port: 5000, path: `/api/v1/planner/${masterId}`, method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        };
        const req3 = http.request(patchOpts, res3 => {
          let b3 = '';
          res3.on('data', d => b3 += d);
          res3.on('end', () => {
            console.log("PATCH done");
            
            // GET blocks
            const getOpts = {
              hostname: '127.0.0.1', port: 5000, path: '/api/v1/planner/daily?date=2025-01-02', method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` }
            };
            const req4 = http.request(getOpts, res4 => {
              let b4 = '';
              res4.on('data', d => b4 += d);
              res4.on('end', () => {
                const getResp = JSON.parse(b4);
                console.log("GET length:", getResp.data.length);
                getResp.data.forEach(x => console.log(x._id, x.title, x.isException));
              });
            });
            req4.end();
          });
        });
        req3.write(patchData);
        req3.end();
      });
    });
    req2.write(postData);
    req2.end();
  });
});
req.write(data);
req.end();
