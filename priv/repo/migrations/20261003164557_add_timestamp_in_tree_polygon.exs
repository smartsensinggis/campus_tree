defmodule Campustree.Repo.Migrations.AddTimestampInTreePolygon do
  use Ecto.Migration

  def change do
    alter table(:campus_tree_polygon) do
      modify :inserted_at, :utc_datetime,
        default: fragment("CURRENT_TIMESTAMP"),
        null: false

      modify :updated_at, :utc_datetime,
        default: fragment("CURRENT_TIMESTAMP"),
        null: false
    end
  end
end
