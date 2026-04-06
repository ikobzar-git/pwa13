<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            abort(403, 'Доступ запрещён.');
        }

        $tokenName = $user->currentAccessToken()?->name;
        if ($tokenName === 'client-session' && ! in_array('client', $roles, true)) {
            abort(403, 'Доступ запрещён.');
        }

        return $next($request);
    }
}
