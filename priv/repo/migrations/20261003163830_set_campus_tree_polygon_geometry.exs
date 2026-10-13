defmodule Campustree.Repo.Migrations.SetCampusTreePolygonGeometry do
  use Ecto.Migration

  def change do
    execute("""
    ALTER TABLE campus_tree_polygon
    ALTER COLUMN geom
    TYPE geometry(MULTIPOLYGON, 32643)
    USING ST_SetSRID(geom, 32643)
    """)
  end
end
