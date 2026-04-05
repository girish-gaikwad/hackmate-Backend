
// function getHackathons() {
//   return fetch("https://api.unstop.com/hackathons")
//     .then((res) => res.json())
//     .then((data) => {
//       console.log(data);
//     })
//     .catch((err) => {
//       console.error(err);
//     });
// }

// getHackathons();

// Using async/await
async function getHackathonsAsync() {
  try {
    const res = await fetch("https://api.unstop.com/hackathons");
    // const data = await res.json();
    const data = await res.text(); // Use text() if the response is not JSON
    require('fs').writeFileSync("unstop_hackathons.txt", data); // Save response to a file
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}

getHackathonsAsync();