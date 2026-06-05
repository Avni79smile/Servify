import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

const SupabaseTodos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getTodos = async () => {
      const { data, error: fetchError } = await supabase
        .from("todos")
        .select("id, name");

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setTodos(data ?? []);
      setLoading(false);
    };

    getTodos();
  }, []);

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-bold">Supabase Todos</h1>

      {loading && <p>Loading todos...</p>}
      {!loading && error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}
      {!loading && !error && todos.length === 0 && <p>No todos found.</p>}

      {!loading && !error && todos.length > 0 && (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li key={todo.id} className="rounded border p-3">
              {todo.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SupabaseTodos;
