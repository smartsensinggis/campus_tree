defmodule Campustree.TreePolygon do
  use Ecto.Schema

  schema "campus_tree_polygon" do
    field :glcm_homog, :float
    field :glcm_contr, :float
    field :glcm_ang_2, :float
    field :asymmetry, :float
    field :elliptic_f, :float
    field :density, :float
    field :glcm_entro, :float
    field :gldv_entro, :float
    field :glcm_dissi, :float
    field :glcm_corre, :float
    field :gldv_ang_2, :float
    field :main_direc, :float
    field :standard_d, :float
    field :standard_1, :float
    field :standard_2, :float
    field :standard_3, :float
    field :standard_4, :float
    field :standard_5, :float
    field :mean_slope, :float
    field :mean_red, :float
    field :mean_green, :float
    field :mean_dsm, :float
    field :mean_blue, :float
    field :mean_avg3, :float
    field :shape_inde, :float
    field :glcm_stdde, :float
    field :compactnes, :float
    field :roundness, :float
    field :glcm_mean_, :float
    field :border_ind, :float
    field :area, :float

    field :local_name, :string
    field :scientific, :string
    field :family, :string
    field :site_name, :string
    field :sr_no, :integer

    field :geom, Geo.PostGIS.Geometry

    timestamps()
  end
end
