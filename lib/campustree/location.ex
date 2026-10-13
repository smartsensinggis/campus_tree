defmodule Campustree.Location do
  use Ecto.Schema
  import Ecto.Changeset

  schema "locations" do
    field :name, :string
    field :latitude, :float
    field :longitude, :float
    field :geom, Geo.PostGIS.Geometry

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(location, attrs) do
    location
    |> cast(attrs, [:name, :latitude, :longitude, :geom])
    |> validate_required([:name, :latitude, :longitude])
  end
end
