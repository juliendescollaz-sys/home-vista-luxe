/**
 * Page d'administration Interphonie
 * Gestion des Sites, Batiments, Logements et Comptes SIP
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Home,
  Phone,
  Users,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  ArrowLeft,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface Site {
  id: string;
  name: string;
  address: string;
  buildingsCount: number;
  unitsCount: number;
  status: "online" | "partial" | "offline";
}

interface Building {
  id: string;
  siteId: string;
  name: string;
  unitsCount: number;
}

interface Unit {
  id: string;
  buildingId: string;
  number: string;
  sipAccounts: SIPAccount[];
}

interface SIPAccount {
  id: string;
  unitId: string;
  username: string;
  domain: string;
  type: "panel" | "mobile";
  registered: boolean;
  lastSeen?: string;
}

// Mock data pour le developpement
const MOCK_SITES: Site[] = [
  {
    id: "site-1",
    name: "Residence Les Cimes",
    address: "123 Avenue du Mont-Blanc, 74000 Annecy",
    buildingsCount: 2,
    unitsCount: 24,
    status: "online",
  },
  {
    id: "site-2",
    name: "Villa Montagne",
    address: "456 Chemin des Alpes, 74400 Chamonix",
    buildingsCount: 1,
    unitsCount: 1,
    status: "partial",
  },
];

const MOCK_BUILDINGS: Building[] = [
  { id: "bldg-1", siteId: "site-1", name: "Batiment A", unitsCount: 12 },
  { id: "bldg-2", siteId: "site-1", name: "Batiment B", unitsCount: 12 },
  { id: "bldg-3", siteId: "site-2", name: "Villa", unitsCount: 1 },
];

const MOCK_UNITS: Unit[] = [
  {
    id: "unit-1",
    buildingId: "bldg-1",
    number: "101",
    sipAccounts: [
      {
        id: "sip-1",
        unitId: "unit-1",
        username: "unit101",
        domain: "sip.neolia.app",
        type: "panel",
        registered: true,
        lastSeen: "2026-01-15T10:30:00Z",
      },
      {
        id: "sip-2",
        unitId: "unit-1",
        username: "unit101-mobile",
        domain: "sip.neolia.app",
        type: "mobile",
        registered: false,
      },
    ],
  },
  {
    id: "unit-2",
    buildingId: "bldg-1",
    number: "102",
    sipAccounts: [
      {
        id: "sip-3",
        unitId: "unit-2",
        username: "unit102",
        domain: "sip.neolia.app",
        type: "panel",
        registered: true,
        lastSeen: "2026-01-15T10:25:00Z",
      },
    ],
  },
];

export default function AdminIntercom() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sites");
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  // Dialog states
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddSIP, setShowAddSIP] = useState(false);

  // Form states
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newSIPType, setNewSIPType] = useState<"panel" | "mobile">("panel");
  const [selectedUnitForSIP, setSelectedUnitForSIP] = useState<string>("");

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filtres
  const buildings = MOCK_BUILDINGS.filter(
    (b) => !selectedSite || b.siteId === selectedSite.id
  );
  const units = MOCK_UNITS.filter(
    (u) => !selectedBuilding || u.buildingId === selectedBuilding.id
  );

  // Handlers
  const handleAddSite = async () => {
    if (!newSiteName.trim()) {
      toast.error("Le nom du site est requis");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Appel API Supabase
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Site "${newSiteName}" cree`);
      setShowAddSite(false);
      setNewSiteName("");
      setNewSiteAddress("");
    } catch (error) {
      toast.error("Erreur lors de la creation du site");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBuilding = async () => {
    if (!selectedSite) {
      toast.error("Selectionnez d'abord un site");
      return;
    }
    if (!newBuildingName.trim()) {
      toast.error("Le nom du batiment est requis");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Appel API Supabase
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Batiment "${newBuildingName}" cree`);
      setShowAddBuilding(false);
      setNewBuildingName("");
    } catch (error) {
      toast.error("Erreur lors de la creation du batiment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUnit = async () => {
    if (!selectedBuilding) {
      toast.error("Selectionnez d'abord un batiment");
      return;
    }
    if (!newUnitNumber.trim()) {
      toast.error("Le numero de logement est requis");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Appel API Supabase
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Logement "${newUnitNumber}" cree`);
      setShowAddUnit(false);
      setNewUnitNumber("");
    } catch (error) {
      toast.error("Erreur lors de la creation du logement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSIPAccount = async () => {
    if (!selectedUnitForSIP) {
      toast.error("Selectionnez un logement");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Appel API Supabase + sync Kamailio
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Compte SIP cree et synchronise avec Kamailio");
      setShowAddSIP(false);
      setSelectedUnitForSIP("");
    } catch (error) {
      toast.error("Erreur lors de la creation du compte SIP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncKamailio = async () => {
    setIsSyncing(true);
    try {
      // TODO: Appel Edge Function pour sync avec Kamailio
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Synchronisation avec Kamailio terminee");
    } catch (error) {
      toast.error("Erreur de synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSIPAccount = async (accountId: string) => {
    if (!confirm("Supprimer ce compte SIP ?")) return;

    try {
      // TODO: Appel API
      toast.success("Compte SIP supprime");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-500">En ligne</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Partiel</Badge>;
      case "offline":
        return <Badge className="bg-red-500">Hors ligne</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gestion Interphonie</h1>
              <p className="text-sm text-muted-foreground">
                Sites, Batiments, Logements et Comptes SIP
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncKamailio}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Kamailio
            </Button>
            <Button variant="outline" onClick={() => navigate("/intercom-test")}>
              <Phone className="h-4 w-4 mr-2" />
              Test SIP
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sites</p>
                  <p className="text-2xl font-bold">{MOCK_SITES.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Batiments</p>
                  <p className="text-2xl font-bold">{MOCK_BUILDINGS.length}</p>
                </div>
                <Home className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Logements</p>
                  <p className="text-2xl font-bold">{MOCK_UNITS.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comptes SIP</p>
                  <p className="text-2xl font-bold">
                    {MOCK_UNITS.reduce((acc, u) => acc + u.sipAccounts.length, 0)}
                  </p>
                </div>
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sites" className="gap-2">
              <Building2 className="h-4 w-4" />
              Sites
            </TabsTrigger>
            <TabsTrigger value="buildings" className="gap-2">
              <Home className="h-4 w-4" />
              Batiments
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-2">
              <Users className="h-4 w-4" />
              Logements
            </TabsTrigger>
            <TabsTrigger value="sip" className="gap-2">
              <Phone className="h-4 w-4" />
              Comptes SIP
            </TabsTrigger>
          </TabsList>

          {/* Sites Tab */}
          <TabsContent value="sites" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sites</CardTitle>
                  <CardDescription>
                    Immeubles et villas equipes du systeme Neolia
                  </CardDescription>
                </div>
                <Dialog open={showAddSite} onOpenChange={setShowAddSite}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un site
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouveau Site</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="siteName">Nom du site</Label>
                        <Input
                          id="siteName"
                          placeholder="Ex: Residence Les Cimes"
                          value={newSiteName}
                          onChange={(e) => setNewSiteName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="siteAddress">Adresse</Label>
                        <Input
                          id="siteAddress"
                          placeholder="Ex: 123 Avenue du Mont-Blanc"
                          value={newSiteAddress}
                          onChange={(e) => setNewSiteAddress(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddSite(false)}
                      >
                        Annuler
                      </Button>
                      <Button onClick={handleAddSite} disabled={isLoading}>
                        {isLoading && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Creer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Adresse</TableHead>
                      <TableHead>Batiments</TableHead>
                      <TableHead>Logements</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_SITES.map((site) => (
                      <TableRow
                        key={site.id}
                        className={
                          selectedSite?.id === site.id ? "bg-muted/50" : ""
                        }
                      >
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {site.address}
                        </TableCell>
                        <TableCell>{site.buildingsCount}</TableCell>
                        <TableCell>{site.unitsCount}</TableCell>
                        <TableCell>{getStatusBadge(site.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSite(site);
                              setActiveTab("buildings");
                            }}
                          >
                            Voir batiments
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buildings Tab */}
          <TabsContent value="buildings" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    Batiments
                    {selectedSite && (
                      <span className="text-muted-foreground font-normal ml-2">
                        - {selectedSite.name}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedSite
                      ? "Batiments de ce site"
                      : "Selectionnez un site pour filtrer"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedSite && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSite(null)}
                    >
                      Voir tous
                    </Button>
                  )}
                  <Dialog open={showAddBuilding} onOpenChange={setShowAddBuilding}>
                    <DialogTrigger asChild>
                      <Button disabled={!selectedSite}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un batiment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouveau Batiment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Site</Label>
                          <Input value={selectedSite?.name || ""} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="buildingName">Nom du batiment</Label>
                          <Input
                            id="buildingName"
                            placeholder="Ex: Batiment A"
                            value={newBuildingName}
                            onChange={(e) => setNewBuildingName(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddBuilding(false)}
                        >
                          Annuler
                        </Button>
                        <Button onClick={handleAddBuilding} disabled={isLoading}>
                          {isLoading && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Creer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Logements</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buildings.map((building) => {
                      const site = MOCK_SITES.find((s) => s.id === building.siteId);
                      return (
                        <TableRow key={building.id}>
                          <TableCell className="font-medium">
                            {building.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {site?.name}
                          </TableCell>
                          <TableCell>{building.unitsCount}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBuilding(building);
                                setActiveTab("units");
                              }}
                            >
                              Voir logements
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Units Tab */}
          <TabsContent value="units" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    Logements
                    {selectedBuilding && (
                      <span className="text-muted-foreground font-normal ml-2">
                        - {selectedBuilding.name}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedBuilding
                      ? "Logements de ce batiment"
                      : "Selectionnez un batiment pour filtrer"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedBuilding && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBuilding(null)}
                    >
                      Voir tous
                    </Button>
                  )}
                  <Dialog open={showAddUnit} onOpenChange={setShowAddUnit}>
                    <DialogTrigger asChild>
                      <Button disabled={!selectedBuilding}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un logement
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouveau Logement</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Batiment</Label>
                          <Input value={selectedBuilding?.name || ""} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unitNumber">Numero de logement</Label>
                          <Input
                            id="unitNumber"
                            placeholder="Ex: 101"
                            value={newUnitNumber}
                            onChange={(e) => setNewUnitNumber(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddUnit(false)}
                        >
                          Annuler
                        </Button>
                        <Button onClick={handleAddUnit} disabled={isLoading}>
                          {isLoading && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Creer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Batiment</TableHead>
                      <TableHead>Comptes SIP</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => {
                      const building = MOCK_BUILDINGS.find(
                        (b) => b.id === unit.buildingId
                      );
                      return (
                        <TableRow key={unit.id}>
                          <TableCell className="font-medium">
                            {unit.number}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {building?.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {unit.sipAccounts.map((acc) => (
                                <Badge
                                  key={acc.id}
                                  variant={acc.registered ? "default" : "outline"}
                                  className={
                                    acc.registered
                                      ? "bg-green-500/20 text-green-700"
                                      : ""
                                  }
                                >
                                  {acc.type === "panel" ? "Panel" : "Mobile"}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUnitForSIP(unit.id);
                                setActiveTab("sip");
                              }}
                            >
                              Gerer SIP
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SIP Accounts Tab */}
          <TabsContent value="sip" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Comptes SIP</CardTitle>
                  <CardDescription>
                    Comptes enregistres sur sip.neolia.app
                  </CardDescription>
                </div>
                <Dialog open={showAddSIP} onOpenChange={setShowAddSIP}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un compte SIP
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouveau Compte SIP</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Logement</Label>
                        <Select
                          value={selectedUnitForSIP}
                          onValueChange={setSelectedUnitForSIP}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selectionnez un logement" />
                          </SelectTrigger>
                          <SelectContent>
                            {MOCK_UNITS.map((unit) => {
                              const building = MOCK_BUILDINGS.find(
                                (b) => b.id === unit.buildingId
                              );
                              return (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {building?.name} - {unit.number}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Type de compte</Label>
                        <Select
                          value={newSIPType}
                          onValueChange={(v) =>
                            setNewSIPType(v as "panel" | "mobile")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="panel">Panel (interieur)</SelectItem>
                            <SelectItem value="mobile">Mobile (app)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                        <p>Le compte sera cree automatiquement :</p>
                        <ul className="list-disc ml-4 mt-2">
                          <li>Username genere selon le logement</li>
                          <li>Password securise auto-genere</li>
                          <li>Sync avec Kamailio VPS</li>
                        </ul>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddSIP(false)}
                      >
                        Annuler
                      </Button>
                      <Button onClick={handleAddSIPAccount} disabled={isLoading}>
                        {isLoading && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Creer et Synchroniser
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Domaine</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Derniere connexion</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_UNITS.flatMap((unit) =>
                      unit.sipAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono">
                            {account.username}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.domain}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {account.type === "panel" ? "Panel" : "Mobile"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {account.registered ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Enregistre</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <XCircle className="h-4 w-4" />
                                <span>Hors ligne</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.lastSeen
                              ? new Date(account.lastSeen).toLocaleString("fr-FR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSIPAccount(account.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Kamailio Connection Status */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="font-medium">Serveur Kamailio</p>
                  <p className="text-sm text-muted-foreground">
                    sip.neolia.app (141.227.158.64)
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Derniere sync: {new Date().toLocaleString("fr-FR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
