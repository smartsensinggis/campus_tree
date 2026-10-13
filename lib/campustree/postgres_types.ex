Postgrex.Types.define(
  CampusTree.PostgresTypes,
  [Geo.PostGIS.Extension] ++ Ecto.Adapters.Postgres.extensions(),
  []
)
