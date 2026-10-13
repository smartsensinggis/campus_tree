defmodule Campustree.Repo do
  use Ecto.Repo,
    otp_app: :campustree,
    adapter: Ecto.Adapters.Postgres
end
