// Registro de simuladores por tipo (el campo `sim.type` de cada tema).
import MotionSim from './MotionSim.jsx';
import FreeFallSim from './FreeFallSim.jsx';
import CircularSim from './CircularSim.jsx';
import ProjectileSim from './ProjectileSim.jsx';
import InclineSim from './InclineSim.jsx';
import LeverSim from './LeverSim.jsx';
import SpringSim from './SpringSim.jsx';
import EnergySim from './EnergySim.jsx';
import CollisionSim from './CollisionSim.jsx';
import VectorSim from './VectorSim.jsx';
import UnitsSim from './UnitsSim.jsx';
import OrbitSim from './OrbitSim.jsx';
import FluidSim from './FluidSim.jsx';
import FlowSim from './FlowSim.jsx';
import ThermoSim from './ThermoSim.jsx';
import GasSim from './GasSim.jsx';
import OpticsSim from './OpticsSim.jsx';
import WaveSim from './WaveSim.jsx';
import ChargesSim from './ChargesSim.jsx';
import CircuitSim from './CircuitSim.jsx';
import CapacitorSim from './CapacitorSim.jsx';
import MagnetSim from './MagnetSim.jsx';
import RelativitySim from './RelativitySim.jsx';
import PhotoelectricSim from './PhotoelectricSim.jsx';

export const SIMULATORS = {
  motion: MotionSim,
  freefall: FreeFallSim,
  circular: CircularSim,
  projectile: ProjectileSim,
  incline: InclineSim,
  lever: LeverSim,
  spring: SpringSim,
  energy: EnergySim,
  collision: CollisionSim,
  vectors: VectorSim,
  units: UnitsSim,
  orbit: OrbitSim,
  fluid: FluidSim,
  flow: FlowSim,
  thermo: ThermoSim,
  gas: GasSim,
  optics: OpticsSim,
  wave: WaveSim,
  charges: ChargesSim,
  circuit: CircuitSim,
  capacitor: CapacitorSim,
  magnet: MagnetSim,
  relativity: RelativitySim,
  photoelectric: PhotoelectricSim,
};
