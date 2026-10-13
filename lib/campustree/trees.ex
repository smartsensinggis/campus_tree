defmodule Campustree.Trees do
  import Ecto.Query

  alias Campustree.Repo

  def geojson do
    path = Path.join(:code.priv_dir(:campustree), "static/data/campus_trees.geojson")
    path |> File.read!() |> Jason.decode!()
  end

  def polygon_geojson do
    polygons =
      Repo.all(
        from p in Campustree.TreePolygon,
          select: %{
            id: p.id,
            name: p.local_name,
            scientific_name: p.scientific,
            family: p.family,
            site: p.site_name,
            area: p.area,
            geom: p.geom
          }
      )

    features =
      Enum.map(polygons, fn polygon ->
        %{
          type: "Feature",
          geometry: Geo.JSON.encode!(polygon.geom),
          properties: %{
            id: polygon.id,
            name: polygon.name,
            scientific_name: polygon.scientific_name,
            family: polygon.family,
            site: polygon.site,
            area: polygon.area
          }
        }
      end)

    %{
      type: "FeatureCollection",
      features: features
    }
  end
end
