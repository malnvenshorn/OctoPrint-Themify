from flask import jsonify
from functools import wraps
from http import HTTPStatus
from octoprint.server.util import has_permissions


def is_file(entry, ext=None):
    """
    Checks if an os.DirEntry is a file and optionally with a specific file ending.
    """
    return entry.is_file() and (entry.name.endswith(ext) if ext is not None else True)


def requires(*permissions):
    """
    Decorator for permission checking.
    """
    def decorator(func):
        @wraps(func)
        def wrapping_function(*args, **kwargs):
            if not has_permissions(*permissions):
                permissionsString = ", ".join([p.get_name() for p in permissions])
                payload = dict(
                    message="Insufficient permissions",
                    description=f"You need the following permissions to access this ressource: {permissionsString}",
                )
                return jsonify(payload), HTTPStatus.FORBIDDEN
            return func(*args, **kwargs)
        return wrapping_function
    return decorator


def exception_handler(func):
    """
    Decorator for basic exception handling.
    https://docs.python.org/3/library/exceptions.html
    """
    @wraps(func)
    def wrapping_function(self, *args, **kwargs):
        try:
            result = func(self, *args, **kwargs)
        except FileNotFoundError as e:
            payload = dict(
                message="File operation failed",
                description=f"{e.strerror}: '{e.filename}'",
            )
            return jsonify(payload), HTTPStatus.NOT_FOUND
        except OSError as e:
            payload = dict(
                message="File operation failed",
                description=f"{e.strerror}: '{e.filename}'",
            )
            return jsonify(payload), HTTPStatus.INTERNAL_SERVER_ERROR
        except Exception:
            # Catch all uncaught exceptions and log them with call stack
            self._logger.exception("Error serving API request")
            payload = dict(
                message="Unknown exception",
                description=("Ideally you should never receive this error, but if you are unlucky enough "
                             "to get one, please create a bug report. You can find more information about "
                             "what happened in the octoprint.log."),
            )
            return jsonify(payload), HTTPStatus.INTERNAL_SERVER_ERROR
        return result
    return wrapping_function
