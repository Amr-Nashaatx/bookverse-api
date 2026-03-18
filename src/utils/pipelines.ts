import mongoose from "mongoose";

export const populateAuthorsOnShelfBooks = (
  shelfId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
) => [
  {
    $match: { _id: shelfId, user: userId },
  },
  {
    $lookup: {
      from: "books",
      let: { bookIds: "$books" },
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$_id", "$$bookIds"] },
          },
        },
        {
          $lookup: {
            from: "authors",
            localField: "authorId",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $addFields: {
            author: { $arrayElemAt: ["$author", 0] },
          },
        },
      ],
      as: "books",
    },
  },
];
