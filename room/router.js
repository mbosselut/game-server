const express = require("express");
const Room = require("./model");
const { Router } = express;
const { toData } = require("../auth/jwt");
const auth = require("../auth/middleware");
const User = require("../user/model");
const Board = require("../board/model");

function roomFactory(stream) {
  const router = new Router();

  router.post("/room", async (req, res, next) => {
    const room = await Room.create(req.body);
    const action = { type: "ROOM", payload: room };
    const data = JSON.stringify(action);
    stream.send(data);
    res.send(room);
  });

  router.patch("/join/:name", auth, async (req, res, next) => {
    let data;
    const auth =
      req.headers.authorization && req.headers.authorization.split(" ");
    if (auth && auth[0] === "Bearer" && auth[1]) {
      data = toData(auth[1]);
    }
    console.log("data is : ", data);
    //Identifying user with userId
    const user = await User.findByPk(data.userId);
    //Getting room name
    const { name } = req.params;
    //Finding room in DB
    const room = await Room.findOne({ where: { name } });
    //Updating user with roomId
    const updatedUser = await user.update({ roomId: room.id });
    //Grabbing all rooms and including relational data
    const rooms = await Room.findAll({ include: [User, Board] });
    //Create a new action with the rooms array as payload
    const action = { type: "ROOMS", payload: rooms };

    const string = JSON.stringify(action);
    //Send the action to the stream
    stream.send(string);

    res.send(updatedUser);
  });

  //Adds 1 point to a player
  router.put("/points/:userId", async (request, response, next) => {
    const { userId } = request.params;
    const user = await User.findByPk(userId);
    const currentPoints = user.points;
    const updated = await user.update({ points: currentPoints + 1 });
    const rooms = await Room.findAll({ include: [User, Board] });
    const action = {
      type: "ROOMS",
      payload: rooms
    };

    const string = JSON.stringify(action);

    stream.send(string);

    response.send(updated);
  });

  //Adding wordToGuess to board
  router.put("/board/:roomId", async (req, res, next) => {
    const { roomId } = req.params;
    const { wordToGuess } = req.body || "";
    const { guesses } = req.body || "";
    const board = await Board.findOne({ where: { roomId: roomId } });

    const updatedBoard = await board.update({ wordToGuess, guesses });
    const rooms = await Room.findAll({ include: [Board, User] });
    const action = {
      type: "ROOMS",
      payload: rooms
    };

    const string = JSON.stringify(action);

    stream.send(string);

    res.send(updatedBoard);
  });

  //Get roomid from roomname
  router.get("/room/:name", (req, res, next) => {
    Room.findOne({
      where: {
        name: req.params.name
      }
    })
      .then(room => {
        res.json(room);
      })
      .catch(next);
  });

  return router;
}

module.exports = roomFactory;
