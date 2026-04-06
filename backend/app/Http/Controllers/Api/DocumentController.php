<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $docs = Document::query()
            ->where('company_id', $companyId)
            ->with('uploader:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'title' => $d->title,
                'category' => $d->category,
                'mime_type' => $d->mime_type,
                'file_size' => $d->file_size,
                'download_url' => url('/storage/' . $d->file_path),
                'uploaded_by' => $d->uploader,
                'created_at' => $d->created_at,
            ]);

        return response()->json($docs);
    }

    public function store(Request $request)
    {
        $user = $this->requireStaff($request);
        if (! $user->isManager()) {
            abort(403);
        }

        $companyId = $this->companyId($request);

        $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|in:contract,rules,instructions,general',
            'file' => 'required|file|max:10240', // 10MB
        ]);

        $file = $request->file('file');
        $path = $file->store('documents/' . $companyId, 'public');

        $doc = Document::create([
            'company_id' => $companyId,
            'title' => $request->input('title'),
            'category' => $request->input('category'),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $user->id,
        ]);

        return response()->json([
            'id' => $doc->id,
            'title' => $doc->title,
            'category' => $doc->category,
            'download_url' => url('/storage/' . $doc->file_path),
            'created_at' => $doc->created_at,
        ], 201);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $this->requireStaff($request);
        if (! $user->isManager()) {
            abort(403);
        }

        $companyId = $this->companyId($request);

        $doc = Document::query()
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->firstOrFail();

        Storage::disk('public')->delete($doc->file_path);
        $doc->delete();

        return response()->json(['deleted' => true]);
    }

    protected function requireStaff(Request $request): User
    {
        $user = $request->user();
        if (! $user->isStaff() && ! $user->isManager()) {
            abort(403, 'Доступно сотрудникам');
        }
        return $user;
    }

    protected function companyId(Request $request): string
    {
        $q = $request->query('company_id');
        if ($q !== null && $q !== '') {
            return (string) $q;
        }
        return (string) $request->input('company_id', config('services.yclients.company_id'));
    }
}
