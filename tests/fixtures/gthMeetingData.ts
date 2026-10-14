// Datos inventados exclusivos de pruebas; nunca se cargan en producción.
import type { AppStateData } from '../../src/types/index.ts';

export const meetingState: AppStateData = {
  "jobPostings": [
    {
      "id": "GTH-QA-1410",
      "code": "QA-1410",
      "title": "Especialista en selección",
      "category": "administrativo",
      "department": "GTHC",
      "period": "2026",
      "status": "activa",
      "phase": "Recepción",
      "vacancies": 1,
      "knockoutRule": "",
      "criteriaVersion": "v1.0",
      "defaultTopN": 3,
      "createdAt": "2026-10-14",
      "bumeran": {
        "avisoId": "QA-1410",
        "updatedAt": null,
        "publicUrl": null,
        "received": 6
      },
      "criteria": [
        {
          "id": "r1",
          "label": "Experiencia en selección de personal",
          "weightPct": 60,
          "type": "LLM"
        },
        {
          "id": "r2",
          "label": "Gestión de indicadores",
          "weightPct": 40,
          "type": "LLM"
        }
      ]
    }
  ],
  "candidates": [
    {
      "id": "qa-person-0",
      "name": "Ana Prueba",
      "email": "persona0@example.com",
      "phone": "987 654 321",
      "currentTitle": "Especialista",
      "currentCompany": "Datos de prueba",
      "source": "Bumeran",
      "summary": "",
      "rawCvText": "Perfil de prueba aislado",
      "savedInTalentPool": false,
      "importedProfile": {
        "documentType": "",
        "documentNumber": "",
        "externalId": "qa-external-0",
        "records": []
      }
    },
    {
      "id": "qa-person-1",
      "name": "Bruno Prueba",
      "email": "persona1@example.com",
      "phone": "987 654 321",
      "currentTitle": "Especialista",
      "currentCompany": "Datos de prueba",
      "source": "Bumeran",
      "summary": "",
      "rawCvText": "Perfil de prueba aislado",
      "savedInTalentPool": false,
      "importedProfile": {
        "documentType": "",
        "documentNumber": "",
        "externalId": "qa-external-1",
        "records": []
      }
    },
    {
      "id": "qa-person-2",
      "name": "Carla Prueba",
      "email": "persona2@example.com",
      "phone": "987 654 321",
      "currentTitle": "Especialista",
      "currentCompany": "Datos de prueba",
      "source": "Bumeran",
      "summary": "",
      "rawCvText": "Perfil de prueba aislado",
      "savedInTalentPool": false,
      "importedProfile": {
        "documentType": "",
        "documentNumber": "",
        "externalId": "qa-external-2",
        "records": []
      }
    },
    {
      "id": "qa-person-3",
      "name": "Diego Prueba",
      "email": "persona3@example.com",
      "phone": "987 654 321",
      "currentTitle": "Especialista",
      "currentCompany": "Datos de prueba",
      "source": "Bumeran",
      "summary": "",
      "rawCvText": "Perfil de prueba aislado",
      "savedInTalentPool": false,
      "importedProfile": {
        "documentType": "",
        "documentNumber": "",
        "externalId": "qa-external-3",
        "records": []
      }
    },
    {
      "id": "qa-person-4",
      "name": "Elena Prueba",
      "email": "persona4@example.com",
      "phone": "987 654 321",
      "currentTitle": "Especialista",
      "currentCompany": "Datos de prueba",
      "source": "Bumeran",
      "summary": "",
      "rawCvText": "Perfil de prueba aislado",
      "savedInTalentPool": false,
      "importedProfile": {
        "documentType": "",
        "documentNumber": "",
        "externalId": "qa-external-4",
        "records": []
      }
    },
    {
      "id": "qa-person-5",
      "name": "Fabio Prueba",
      "email": null,
      "phone": null,
      "currentTitle": "Especialista",
      "currentCompany": "Datos de prueba",
      "source": "Bumeran",
      "summary": "",
      "rawCvText": "Perfil de prueba aislado",
      "savedInTalentPool": false,
      "importedProfile": {
        "documentType": "",
        "documentNumber": "",
        "externalId": "qa-external-5",
        "records": []
      }
    }
  ],
  "applications": [
    {
      "id": "qa-application-0",
      "jobPostingId": "GTH-QA-1410",
      "candidateId": "qa-person-0",
      "stage": "preseleccionado",
      "llmScore": null,
      "mandatoryRequirementStatus": "sin_verificar",
      "whyScoreNotes": {
        "explanation": "",
        "strengths": [],
        "evidenceSummary": ""
      },
      "criteriaBreakdown": {},
      "createdAt": "2026-10-14T00:00:00Z",
      "updatedAt": "2026-10-14T00:00:00Z",
      "embeddingMatch": {
        "score": 1.0,
        "ranking": 1,
        "requirementSims": {
          "r1": 0.85,
          "r2": 0.6
        },
        "requirementEvidence": {},
        "explanation": "",
        "backend": "e5",
        "criteriaVersion": "v1.0",
        "evaluatedAt": "2026-10-14T00:00:00Z"
      }
    },
    {
      "id": "qa-application-1",
      "jobPostingId": "GTH-QA-1410",
      "candidateId": "qa-person-1",
      "stage": "postulado",
      "llmScore": null,
      "mandatoryRequirementStatus": "sin_verificar",
      "whyScoreNotes": {
        "explanation": "",
        "strengths": [],
        "evidenceSummary": ""
      },
      "criteriaBreakdown": {},
      "createdAt": "2026-10-14T00:00:00Z",
      "updatedAt": "2026-10-14T00:00:00Z",
      "embeddingMatch": {
        "score": 0.88,
        "ranking": 2,
        "requirementSims": {
          "r1": 0.75,
          "r2": null
        },
        "requirementEvidence": {},
        "explanation": "",
        "backend": "e5",
        "criteriaVersion": "v1.0",
        "evaluatedAt": "2026-10-14T00:00:00Z"
      }
    },
    {
      "id": "qa-application-2",
      "jobPostingId": "GTH-QA-1410",
      "candidateId": "qa-person-2",
      "stage": "postulado",
      "llmScore": null,
      "mandatoryRequirementStatus": "sin_verificar",
      "whyScoreNotes": {
        "explanation": "",
        "strengths": [],
        "evidenceSummary": ""
      },
      "criteriaBreakdown": {},
      "createdAt": "2026-10-14T00:00:00Z",
      "updatedAt": "2026-10-14T00:00:00Z",
      "embeddingMatch": {
        "score": 0.76,
        "ranking": 3,
        "requirementSims": {
          "r1": 0.6499999999999999,
          "r2": 0.7
        },
        "requirementEvidence": {},
        "explanation": "",
        "backend": "e5",
        "criteriaVersion": "v1.0",
        "evaluatedAt": "2026-10-14T00:00:00Z"
      }
    },
    {
      "id": "qa-application-3",
      "jobPostingId": "GTH-QA-1410",
      "candidateId": "qa-person-3",
      "stage": "postulado",
      "llmScore": null,
      "mandatoryRequirementStatus": "sin_verificar",
      "whyScoreNotes": {
        "explanation": "",
        "strengths": [],
        "evidenceSummary": ""
      },
      "criteriaBreakdown": {},
      "createdAt": "2026-10-14T00:00:00Z",
      "updatedAt": "2026-10-14T00:00:00Z",
      "embeddingMatch": {
        "score": 0.64,
        "ranking": 4,
        "requirementSims": {
          "r1": 0.5499999999999999,
          "r2": 0.75
        },
        "requirementEvidence": {},
        "explanation": "",
        "backend": "e5",
        "criteriaVersion": "v1.0",
        "evaluatedAt": "2026-10-14T00:00:00Z"
      }
    },
    {
      "id": "qa-application-4",
      "jobPostingId": "GTH-QA-1410",
      "candidateId": "qa-person-4",
      "stage": "postulado",
      "llmScore": null,
      "mandatoryRequirementStatus": "sin_verificar",
      "whyScoreNotes": {
        "explanation": "",
        "strengths": [],
        "evidenceSummary": ""
      },
      "criteriaBreakdown": {},
      "createdAt": "2026-10-14T00:00:00Z",
      "updatedAt": "2026-10-14T00:00:00Z",
      "embeddingMatch": {
        "score": 0.52,
        "ranking": 5,
        "requirementSims": {
          "r1": 0.44999999999999996,
          "r2": 0.8
        },
        "requirementEvidence": {},
        "explanation": "",
        "backend": "e5",
        "criteriaVersion": "v1.0",
        "evaluatedAt": "2026-10-14T00:00:00Z"
      }
    },
    {
      "id": "qa-application-5",
      "jobPostingId": "GTH-QA-1410",
      "candidateId": "qa-person-5",
      "stage": "postulado",
      "llmScore": null,
      "mandatoryRequirementStatus": "sin_verificar",
      "whyScoreNotes": {
        "explanation": "",
        "strengths": [],
        "evidenceSummary": ""
      },
      "criteriaBreakdown": {},
      "createdAt": "2026-10-14T00:00:00Z",
      "updatedAt": "2026-10-14T00:00:00Z",
      "embeddingMatch": {
        "score": 0.4,
        "ranking": 6,
        "requirementSims": {
          "r1": 0.35,
          "r2": 0.85
        },
        "requirementEvidence": {},
        "explanation": "",
        "backend": "e5",
        "criteriaVersion": "v1.0",
        "evaluatedAt": "2026-10-14T00:00:00Z"
      }
    }
  ],
  "activities": [],
  "decisionLogs": [],
  "emailDrafts": [],
  "interviewRecords": [],
  "activeJobPostingId": "GTH-QA-1410",
  "selectedMethod": "LLM",
  "topN": 3,
  "theme": "light",
  "reducedMotion": true
};
