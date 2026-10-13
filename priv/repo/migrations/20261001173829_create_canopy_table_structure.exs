defmodule Campustree.Repo.Migrations.CreateCanopyTableStructure do
  use Ecto.Migration

  def change do
    create table(:campus_trees) do
      add :glcm_homog, :float
      add :glcm_contr, :float
      add :glcm_ang_2, :float
      add :asymmetry, :float
      add :elliptic_f, :float
      add :density, :float
      add :glcm_entro, :float
      add :gldv_entro, :float
      add :glcm_dissi, :float
      add :glcm_corre, :float
      add :gldv_ang_2, :float
      add :main_direc, :float
      add :standard_d, :float
      add :standard_1, :float
      add :standard_2, :float
      add :standard_3, :float
      add :standard_4, :float
      add :standard_5, :float
      add :mean_slope, :float
      add :mean_red, :float
      add :mean_green, :float
      add :mean_dsm, :float
      add :mean_blue, :float
      add :mean_avg3, :float
      add :shape_inde, :float
      add :glcm_stdde, :float
      add :compactnes, :float
      add :roundness, :float
      add :glcm_mean_, :float
      add :border_ind, :float
      add :area, :float

      add :local_name, :string
      add :scientific, :string
      add :family, :string
      add :site_name, :string
      add :sr_no, :integer

      add :geom, :geometry, subtype: :multipolygon, srid: 4326

      timestamps()
    end

    create index(:campus_trees, [:geom], using: :gist)
  end
end
