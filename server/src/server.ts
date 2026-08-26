import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { client } from "./db.ts";

dotenv.config();

const app = express();
const port = process.env.PORT;
const corsOrigin = process.env.CORS_ORIGIN;

if (!corsOrigin) {
    throw new Error("CORS_ORIGIN is not configured");
}

const corsOptions = {
    origin: corsOrigin,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());


app.get("/api/todos", async(req, res) => {
    try {
        const query = `
                 SELECT id, title, description, is_completed AS completed,
                     completed_at AS "completedAt", created_at AS "createdAt",
                     updated_at AS "updatedAt", deleted_at AS "deletedAt"
            FROM todos
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        `;
        const result = await client.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching todos:", error);
        res.status(500).json({ error: "Internal server error" });
    }
})

app.post("/api/todos", async (req, res) => {
    try {
        const { title, description } = req.body;
        if (typeof title !== "string" || !title.trim()) {
            res.status(400).json({ error: "Title is required" });
            return;
        }

        const result = await client.query(
            `INSERT INTO     todos (title, description)
             VALUES ($1, $2)
             RETURNING id, title, description, is_completed AS completed,
                       completed_at AS "completedAt", created_at AS "createdAt",
                       updated_at AS "updatedAt", deleted_at AS "deletedAt"`,
            [title.trim(), typeof description === "string" ? description.trim() : null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating todo:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.patch("/api/todos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { title, description, completed } = req.body;

    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: "Invalid todo id" });
        return;
    }
    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
        res.status(400).json({ error: "Title must not be empty" });
        return;
    }
    if (description !== undefined && description !== null && typeof description !== "string") {
        res.status(400).json({ error: "Description must be a string or null" });
        return;
    }
    if (completed !== undefined && typeof completed !== "boolean") {
        res.status(400).json({ error: "Completed must be a boolean" });
        return;
    }

    try {
        const result = await client.query(
            `UPDATE todos
             SET title = COALESCE($1, title),
                 description = CASE WHEN $2::boolean THEN $3 ELSE description END,
                 is_completed = COALESCE($4, is_completed),
                 completed_at = CASE
                     WHEN $4 = TRUE THEN COALESCE(completed_at, NOW())
                     WHEN $4 = FALSE THEN NULL
                     ELSE completed_at
                 END,
                 updated_at = NOW()
             WHERE id = $5 AND deleted_at IS NULL
             RETURNING id, title, description, is_completed AS completed,
                       completed_at AS "completedAt", created_at AS "createdAt",
                       updated_at AS "updatedAt", deleted_at AS "deletedAt"`,
            [
                title === undefined ? null : title.trim(),
                description !== undefined,
                description === undefined ? null : description,
                completed === undefined ? null : completed,
                id,
            ]
        );

        if (!result.rowCount) {
            res.status(404).json({ error: "Todo not found" });
            return;
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating todo:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/api/todos/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ error: "Invalid todo id" });
        return;
    }

    try {
        const result = await client.query(
            `UPDATE todos SET deleted_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND deleted_at IS NULL
             RETURNING id`,
            [id]
        );
        if (!result.rowCount) {
            res.status(404).json({ error: "Todo not found" });
            return;
        }
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting todo:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


export default app;

if (process.env.VERCEL !== "1") {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}