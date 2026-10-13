defmodule Campustree.Repo.Migrations.FixPolygonTable do
  use Ecto.Migration

  def change do
    alter table(:campus_tree_polygon) do
      modify :geom, :geometry, srid: 32643
    end
  end
end
