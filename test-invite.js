import fetch from 'node-fetch';

async function testInvite() {
  try {
    const res = await fetch("http://localhost:3000/api/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Need to bypass authMiddleware or emulate a user?
      },
      body: JSON.stringify({ email: "test@test.com" })
    });
    console.log(res.status, await res.text());
  } catch (e) {
    console.error(e);
  }
}

testInvite();
