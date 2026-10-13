defmodule Campustree.Repo.Migrations.FixCampusTreesGeometry do
  use Ecto.Migration

  def change do
    alter table(:campus_trees) do
      modify :geom, :geometry, subtype: :point, srid: 32643
    end
  end
end
