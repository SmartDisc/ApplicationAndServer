<?php

namespace App\Controller;

use App\Entity\Disc;
use App\Entity\DiscThrow;
use App\Entity\User;
use App\Repository\DiscRepository;
use App\Repository\DiscThrowRepository;
use App\Serializer\DiscThrowSerializer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use function is_bool;
use function is_float;
use function is_int;
use function is_string;

#[Route('/api/discs')]
class DiscThrowController extends AbstractController
{
    use JsonBodyTrait;

    #[Route('/{id}/throws', name: 'app_disc_throws_list', methods: ['GET'])]
    public function list(
        string $id,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscThrowRepository $throwRepository,
        DiscThrowSerializer $discThrowSerializer,
    ): JsonResponse {
        $disc = $this->resolveAccessibleDisc($id, $user, $discRepository);
        if (!$disc instanceof Disc) {
            return $this->discNotFound();
        }

        return $this->json(array_map($discThrowSerializer->discThrow(...), $throwRepository->findByDiscOrdered($disc)));
    }

    #[Route('/{id}/throws', name: 'app_disc_throws_create', methods: ['POST'])]
    public function create(
        string $id,
        Request $request,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscThrowRepository $throwRepository,
        EntityManagerInterface $entityManager,
        DiscThrowSerializer $discThrowSerializer,
    ): JsonResponse {
        $disc = $this->resolveAccessibleDisc($id, $user, $discRepository);
        if (!$disc instanceof Disc) {
            return $this->discNotFound();
        }

        $data = $this->decodeJsonBody($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (!is_string($data['recordedAt'] ?? null) || !is_int($data['durationMs'] ?? null)) {
            return $this->json(['error' => 'recordedAt and durationMs are required.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $recordedAt = new \DateTimeImmutable($data['recordedAt']);
        } catch (\Exception) {
            return $this->json(['errors' => ['recordedAt' => 'recordedAt must be a valid ISO 8601 date.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $durationMs = $data['durationMs'];
        if ($durationMs < 0) {
            return $this->json(['errors' => ['durationMs' => 'durationMs must be a non-negative integer.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $nameResult = $this->resolveThrowName($data['name'] ?? null, $disc, $throwRepository);
        if ($nameResult instanceof JsonResponse) {
            return $nameResult;
        }
        [$name, $isAutoNamed] = $nameResult;

        $throw = new DiscThrow($disc, $name, $isAutoNamed, $recordedAt, $durationMs);
        $throw->setRecordedBy($user);

        $numericFieldsError = $this->applyOptionalNumericFields($throw, $data);
        if ($numericFieldsError instanceof JsonResponse) {
            return $numericFieldsError;
        }

        $seriesError = $this->applySeries($throw, $data);
        if ($seriesError instanceof JsonResponse) {
            return $seriesError;
        }

        if (array_key_exists('sampleCount', $data)) {
            if (!is_int($data['sampleCount']) || $data['sampleCount'] < 0) {
                return $this->json(['errors' => ['sampleCount' => 'sampleCount must be a non-negative integer.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $throw->setSampleCount($data['sampleCount']);
        } else {
            $throw->setSampleCount(0);
        }

        $entityManager->persist($throw);
        $entityManager->flush();

        return $this->json($discThrowSerializer->discThrow($throw), Response::HTTP_CREATED);
    }

    #[Route('/{id}/throws/{throwId}', name: 'app_disc_throws_update', methods: ['PATCH'])]
    public function update(
        string $id,
        string $throwId,
        Request $request,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscThrowRepository $throwRepository,
        EntityManagerInterface $entityManager,
        DiscThrowSerializer $discThrowSerializer,
    ): JsonResponse {
        $disc = $this->resolveAccessibleDisc($id, $user, $discRepository);
        if (!$disc instanceof Disc) {
            return $this->discNotFound();
        }

        $data = $this->decodeJsonBody($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (!array_key_exists('name', $data) && !array_key_exists('favorite', $data)) {
            return $this->json(['error' => 'name or favorite is required.', 'code' => 'missing_required_fields'], Response::HTTP_BAD_REQUEST);
        }

        $throw = $throwRepository->find($throwId);
        if (!$throw instanceof DiscThrow || $throw->getDisc()->getId() !== $disc->getId()) {
            return $this->json(['error' => 'Throw not found.', 'code' => 'throw_not_found'], Response::HTTP_NOT_FOUND);
        }

        if (array_key_exists('name', $data)) {
            if (!is_string($data['name'])) {
                return $this->json(['errors' => ['name' => 'Name must be a string.'], 'code' => 'invalid_throw_name'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $trimmed = trim($data['name']);
            if ('' === $trimmed || mb_strlen($trimmed) > 60) {
                return $this->json(['errors' => ['name' => 'Name must be between 1 and 60 characters.'], 'code' => 'invalid_throw_name'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $throw->setName($trimmed);
            $throw->setIsAutoNamed(false);
        }

        if (array_key_exists('favorite', $data)) {
            if (!is_bool($data['favorite'])) {
                return $this->json(['errors' => ['favorite' => 'favorite must be a boolean.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $throw->setFavorite($data['favorite']);
        }

        $entityManager->flush();

        return $this->json($discThrowSerializer->discThrow($throw));
    }

    #[Route('/{id}/throws/{throwId}', name: 'app_disc_throws_delete', methods: ['DELETE'])]
    public function delete(
        string $id,
        string $throwId,
        #[CurrentUser] User $user,
        DiscRepository $discRepository,
        DiscThrowRepository $throwRepository,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $disc = $this->resolveAccessibleDisc($id, $user, $discRepository);
        if (!$disc instanceof Disc) {
            return $this->discNotFound();
        }

        $throw = $throwRepository->find($throwId);
        if (!$throw instanceof DiscThrow || $throw->getDisc()->getId() !== $disc->getId()) {
            return $this->json(['error' => 'Throw not found.', 'code' => 'throw_not_found'], Response::HTTP_NOT_FOUND);
        }

        $entityManager->remove($throw);
        $entityManager->flush();

        return $this->json(['message' => 'Throw deleted.']);
    }

    // 404 (rather than 403) whether the disc doesn't exist, belongs to someone
    // else, or isn't shared with this user, so this endpoint can't be used to
    // probe disc ownership/sharing — mirrors DiscController::rename().
    private function resolveAccessibleDisc(string $id, User $user, DiscRepository $discRepository): ?Disc
    {
        $disc = $discRepository->find($id);
        if (!$disc instanceof Disc) {
            return null;
        }

        $isOwner = $disc->getOwner()?->getId() === $user->getId();
        $isShared = $disc->getSharedPeople()->contains($user);

        return ($isOwner || $isShared) ? $disc : null;
    }

    private function discNotFound(): JsonResponse
    {
        return $this->json(['error' => 'Disc not found.', 'code' => 'disc_not_found'], Response::HTTP_NOT_FOUND);
    }

    /**
     * @return array{0: string, 1: bool}|JsonResponse
     */
    private function resolveThrowName(mixed $name, Disc $disc, DiscThrowRepository $throwRepository): array|JsonResponse
    {
        if (null === $name) {
            return [$this->generateThrowName($disc, $throwRepository), true];
        }

        if (!is_string($name)) {
            return $this->json(['errors' => ['name' => 'Name must be a string.'], 'code' => 'invalid_throw_name'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $trimmed = trim($name);
        if ('' === $trimmed || mb_strlen($trimmed) > 60) {
            return $this->json(['errors' => ['name' => 'Name must be between 1 and 60 characters.'], 'code' => 'invalid_throw_name'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return [$trimmed, false];
    }

    private function generateThrowName(Disc $disc, DiscThrowRepository $throwRepository): string
    {
        return 'Throw '.(count($throwRepository->findByDiscOrdered($disc)) + 1);
    }

    private function applyOptionalNumericFields(DiscThrow $throw, array $data): ?JsonResponse
    {
        $setters = [
            'maxRpm' => $throw->setMaxRpm(...),
            'maxAltM' => $throw->setMaxAltM(...),
            'maxAccelMagnitude' => $throw->setMaxAccelMagnitude(...),
            'avgTempC' => $throw->setAvgTempC(...),
        ];

        foreach ($setters as $field => $setter) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $value = $data[$field];
            if (null !== $value && !is_int($value) && !is_float($value)) {
                return $this->json(['errors' => [$field => ucfirst($field).' must be a number.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $setter(null === $value ? null : (float) $value);
        }

        return null;
    }

    private function applySeries(DiscThrow $throw, array $data): ?JsonResponse
    {
        if (!array_key_exists('series', $data)) {
            return null;
        }

        $series = $data['series'];
        if (!is_array($series) || !array_is_list($series)) {
            return $this->json(['errors' => ['series' => 'series must be an array.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (count($series) > 3000) {
            return $this->json(['errors' => ['series' => 'series must contain at most 3000 entries.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        foreach ($series as $entry) {
            if (
                !is_array($entry)
                || 3 !== count($entry)
                || !array_key_exists('tMs', $entry)
                || !array_key_exists('rpm', $entry)
                || !array_key_exists('altM', $entry)
            ) {
                return $this->json(['errors' => ['series' => 'Each series entry must have exactly tMs, rpm, and altM.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            if (!is_int($entry['tMs']) || $entry['tMs'] < 0) {
                return $this->json(['errors' => ['series' => 'Each series entry must have a non-negative integer tMs.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            if ((!is_int($entry['rpm']) && !is_float($entry['rpm'])) || $entry['rpm'] < 0) {
                return $this->json(['errors' => ['series' => 'Each series entry must have a non-negative numeric rpm.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            if (!is_int($entry['altM']) && !is_float($entry['altM'])) {
                return $this->json(['errors' => ['series' => 'Each series entry must have a numeric altM.'], 'code' => 'invalid_throw_data'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $throw->setSeries($series);

        return null;
    }
}
