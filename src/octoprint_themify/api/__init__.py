import os

from http import HTTPStatus
from flask import request, jsonify, Response
from octoprint.access.permissions import Permissions
from octoprint.plugin import BlueprintPlugin

from .utils import is_file
from .utils import requires
from .utils import exception_handler

route = BlueprintPlugin.route


class ThemifyAPI(BlueprintPlugin):

    @route("/api/themes", methods=["GET"])
    @requires(Permissions.SETTINGS_READ)
    @exception_handler
    def get_theme_list(self):
        """
        Retrives a list of all themes.
        """
        themesDir = self.get_plugin_data_folder()
        themes = [os.path.splitext(entry.name)[0] for entry in os.scandir(themesDir) if is_file(entry, ".css")]
        return jsonify(sorted(themes, key=str.lower)), HTTPStatus.OK

    @route("/api/themes/<string:name>", methods=["GET"])
    @requires(Permissions.SETTINGS_READ)
    @exception_handler
    def get_theme(self, name):
        with open(os.path.join(self.get_plugin_data_folder(), f"{name}.css"), mode="r") as file:
            return Response(file.readlines(), mimetype="text/plain"), HTTPStatus.OK

    @route("/api/themes/<string:name>", methods=["POST"])
    @requires(Permissions.SETTINGS)
    @exception_handler
    def save_theme(self, name):
        # Validate content-type
        if "application/text" not in request.headers["Content-Type"]:
            payload = dict(
                message="Invalid content-type",
                description="Expecting application/text",
            )
            return jsonify(payload), HTTPStatus.BAD_REQUEST

        # Write file
        with open(os.path.join(self.get_plugin_data_folder(), f"{name}.css"), mode="wb") as file:
            file.write(request.data)

        return "", HTTPStatus.NO_CONTENT

    @route("/api/themes/<string:name>", methods=["DELETE"])
    @requires(Permissions.SETTINGS)
    @exception_handler
    def delete_theme(self, name):
        """
        Deletes an existing theme.
        """
        os.remove(os.path.join(self.get_plugin_data_folder(), f"{name}.css"))
        return "", HTTPStatus.NO_CONTENT
