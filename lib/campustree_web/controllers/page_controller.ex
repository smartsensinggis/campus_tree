defmodule CampustreeWeb.PageController do
  use CampustreeWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
