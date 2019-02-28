const express = require("express");
const request = require("request-promise");
const wrap = require("./middleware");

const app = express();

app.set("port", process.env.PORT || 3000);

app.get(
  "/people",
  wrap(async (req, res, next) => {
    if (
      req.query.sortBy &&
      !["name", "height", "mass"].includes(req.query.sortBy)
    ) {
      throw new Error(`${req.query.sortBy} is not valid`);
    }

    try {
      var people = await fetchAll("people");
    } catch (err) {
      throw new Error(`Could not connect https://swapi.co/api/people: ${err}`);
    }

    if (req.query.sortBy) {
      people = people.map(p => {
        p.height = p.height.replace(/,/g, "");
        p.mass = p.mass.replace(/,/g, "");

        p.height = parseFloat(p.height) || null;
        p.mass = parseFloat(p.mass) || null;

        return p;
      });

      if (req.query.sortBy === "name") {
        people.sort((a, b) => {
          return a.name > b.name ? 1 : -1;
        });
      } else {
        people.sort((a, b) => {
          if (a[req.query.sortBy] === null) return 1;
          else if (b[req.query.sortBy] === null) return -1;

          return a[req.query.sortBy] - b[req.query.sortBy];
        });
      }
    }

    res.status(200).send(people);
  })
);

app.get(
  "/planets",
  wrap(async (req, res, next) => {
    try {
      var planets = await fetchAll("planets");
    } catch (err) {
      throw new Error(`Could not connect https://swapi.co/api/planets: ${err}`);
    }

    for (var planet of planets) {
      let residentNames = [];

      for (var resident of planet.residents) {
        try {
          var residentDetails = await request.get(resident, { json: true });
        } catch (err) {
          throw new Error(`Could not connect ${resident}: ${err}`);
        }

        residentNames.push(residentDetails.name);
      }

      planet.residents = residentNames;
    }

    res.status(200).send(planets);
  })
);

app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    error: err.message
  });
});

app.listen(app.get("port"), () =>
  console.log(`Server running on port ${app.get("port")}`)
);

const fetchAll = async resource => {
  let results = [];

  let url = `https://swapi.co/api/${resource}`;

  do {
    var resourcePage = await request.get(url, { json: true });

    results = results.concat(resourcePage.results);
    url = resourcePage.next;
  } while (resourcePage.next);

  return results;
};
