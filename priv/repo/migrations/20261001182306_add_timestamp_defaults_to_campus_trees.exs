defmodule CampusTree.Repo.Migrations.AddTimestampDefaultsToCampusTrees do
  use Ecto.Migration

  def change do
    alter table(:campus_trees) do
      modify :inserted_at, :utc_datetime,
        default: fragment("CURRENT_TIMESTAMP"),
        null: false

      modify :updated_at, :utc_datetime,
        default: fragment("CURRENT_TIMESTAMP"),
        null: false
    end
  end
end
